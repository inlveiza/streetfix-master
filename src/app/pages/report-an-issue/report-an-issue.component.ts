import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnInit, ViewChild, inject } from '@angular/core';
import { FirebaseError } from '@angular/fire/app';
import { Auth } from '@angular/fire/auth';
import { Firestore, addDoc, collection, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CloudinaryService } from '../../services/cloudinary.service';
import { UserService } from '../../services/user.service';
import { SuccessDialogComponent } from './success-dialog.component';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

@Component({
  selector: 'app-report-an-issue',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    SuccessDialogComponent
  ],
  providers: [CloudinaryService, UserService],
  templateUrl: './report-an-issue.component.html',
  styleUrls: ['./report-an-issue.component.css']
})
export class ReportAnIssueComponent implements OnInit, AfterViewInit {
  private firestore: Firestore = inject(Firestore);
  private auth: Auth = inject(Auth);
  private http: HttpClient = inject(HttpClient);
  
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  
  reportForm: FormGroup;
  username: string = 'User';
  currentLocation: { lat: number; lng: number } | null = null;
  private hasInitialLocation: boolean = false;
  isSubmitting: boolean = false;
  errorMessage: string = '';
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  map: L.Map | null = null;
  marker: L.Marker | null = null;
  isLocating: boolean = false;
  isSearching: boolean = false;
  showCamera: boolean = false;
  stream: MediaStream | null = null;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  successMessage = '';
  isEmailUnverified = false;
  isAdmin = false;
  private locationWatchId: number | null = null;
  private readonly DEFAULT_COORDS = {
    lat: 14.8733952,
    lng: 120.2782208
  };
  private readonly GEOLOCATION_OPTIONS: PositionOptions = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 10000
  };
  private readonly MAX_ACCURACY = 500;
  private readonly MIN_ACCURACY = 0;
  private readonly MAX_ATTEMPTS = 1;
  private readonly LOCATION_THRESHOLD = 0.01;
  private isInitialized = false;
  private locationAttempts = 0;
  private lastLocation: { lat: number; lng: number; accuracy: number } | null = null;
  private mapInitialized = false;
  private forceLocationUpdate = false;
  private hasValidLocation = false;
  private isFirstLoad = true;
  showSuccessDialog = false;

  constructor(
    private fb: FormBuilder,
    private ngZone: NgZone,
    private cloudinaryService: CloudinaryService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {
    this.reportForm = this.fb.group({
      category: ['', Validators.required],
      location: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
      imageUrl: [null]
    });

    // Subscribe to form value changes for debugging
    this.reportForm.valueChanges.subscribe(values => {
      console.log('Form values changed:', values);
      // Prevent setting default location
      if (values.latitude === this.DEFAULT_COORDS.lat && values.longitude === this.DEFAULT_COORDS.lng) {
        console.log('Detected default location, clearing values');
        this.reportForm.patchValue({
          latitude: null,
          longitude: null,
          location: ''
        }, { emitEvent: false });
        this.hasValidLocation = false;
      }
    });
  }

  async ngOnInit() {
    // Check if running on HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.warn('Application is not running on HTTPS. Geolocation may not work.');
    }

    // Check if geolocation is supported
    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser');
      this.errorMessage = 'Your browser does not support geolocation. Please use a modern browser.';
      return;
    }

    // Check if geolocation permission is granted
    navigator.permissions.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'denied') {
        console.error('Geolocation permission denied');
        this.errorMessage = 'Location access denied. Please enable location services in your browser settings.';
      }
    });

    // Get current user and fetch their data
    const user = this.auth.currentUser;
    if (user) {
      try {
        const userData = await this.userService.getUserData(user.uid);
        if (userData) {
          this.username = userData.fullName || user.email?.split('@')[0] || 'User';
          this.isAdmin = userData.role === 'admin';
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    }
  }

  ngAfterViewInit() {
    // Add a small delay to ensure the map container is ready
    setTimeout(() => {
      this.initializeMap();
      // Automatically get location after map is initialized
      this.getCurrentLocation();
    }, 100);
  }

  private initializeMap() {
    if (!this.mapContainer) {
      console.error('Map container not found');
      return;
    }

    try {
      // Clear any existing map
      if (this.map) {
        this.map.remove();
        this.map = null;
      }

      console.log('Initializing map...');
      
      // Initialize map with a default view of the Philippines
      this.map = L.map(this.mapContainer.nativeElement, {
        zoomControl: true,
        attributionControl: true,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        center: [12.8797, 121.7740], // Center of Philippines
        zoom: 6
      });

      console.log('Map initialized, adding tile layer...');

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);

      // Add click event to map
      this.map.on('click', (event: L.LeafletMouseEvent) => {
        const { lat, lng } = event.latlng;
        console.log('Map clicked at:', { lat, lng });
        this.updateLocation(lat, lng);
      });

      this.mapInitialized = true;
      this.isInitialized = true;
      console.log('Map ready for user interaction');

    } catch (error) {
      console.error('Error initializing map:', error);
      this.errorMessage = 'Error initializing map. Please refresh the page.';
    }
  }

  getCurrentLocation() {
    if (!this.mapInitialized) {
      console.error('Map not initialized yet');
      this.errorMessage = 'Map is not ready. Please wait a moment and try again.';
      return;
    }

    console.log('=== Getting Current Location ===');
    this.isLocating = true;
    this.errorMessage = '';
    this.locationAttempts = 0;
    this.lastLocation = null;
    this.forceLocationUpdate = true;
    this.hasValidLocation = false;

    // Clear any existing location data
    this.currentLocation = null;
    this.reportForm.patchValue({
      latitude: null,
      longitude: null,
      location: ''
    }, { emitEvent: false });

    // Clear any existing watch
    if (this.locationWatchId) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }

    console.log('Requesting location with options:', this.GEOLOCATION_OPTIONS);

    // Try to get a fresh location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          this.handleLocationUpdate(position);
        });
      },
      (error) => {
        console.error('Initial location error:', error);
        this.ngZone.run(() => {
          this.handleLocationError(error);
          // If getCurrentPosition fails, try watchPosition
          this.startLocationWatch();
        });
      },
      this.GEOLOCATION_OPTIONS
    );
  }

  private startLocationWatch() {
    console.log('Starting location watch with options:', this.GEOLOCATION_OPTIONS);
    
    this.locationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        this.ngZone.run(() => {
          this.handleLocationUpdate(position);
        });
      },
      (error) => {
        console.error('Watch position error:', error);
        this.ngZone.run(() => {
          this.handleLocationError(error);
          if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
          }
        });
      },
      this.GEOLOCATION_OPTIONS
    );
  }

  private handleLocationError(error: GeolocationPositionError) {
    console.error('Location error:', error);
    switch (error.code) {
      case error.PERMISSION_DENIED:
        this.errorMessage = 'Location access denied. Please enable location services in your browser settings and refresh the page.';
        break;
      case error.POSITION_UNAVAILABLE:
        this.errorMessage = 'Location information is unavailable. This could be due to:\n' +
          '• GPS signal is blocked (indoors, underground, or in urban canyons)\n' +
          '• GPS is turned off on your device\n' +
          '• Poor internet connection\n' +
          'Please try moving to an open area or select your location manually on the map.';
        break;
      case error.TIMEOUT:
        this.errorMessage = 'Location request timed out. This could be due to:\n' +
          '• Slow GPS signal acquisition\n' +
          '• Poor internet connection\n' +
          '• Device GPS hardware issues\n' +
          'Please try again or select your location manually on the map.';
        break;
      default:
        this.errorMessage = 'An error occurred while getting your location. Please try again or select your location manually on the map.';
    }
    this.isLocating = false;
    this.cdr.detectChanges();
  }

  private handleLocationUpdate(position: GeolocationPosition) {
    this.locationAttempts++;
    console.log(`=== Location Update (Attempt ${this.locationAttempts}) ===`);
    console.log('Raw position:', position);
    console.log('Position coords:', position.coords);
    console.log('Accuracy:', position.coords.accuracy, 'meters');
    
    if (position.coords) {
      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      console.log('New coordinates with accuracy:', newLocation);
      
      // Check if this is the same as the last location
      if (this.lastLocation && 
          Math.abs(this.lastLocation.lat - newLocation.lat) < this.LOCATION_THRESHOLD && 
          Math.abs(this.lastLocation.lng - newLocation.lng) < this.LOCATION_THRESHOLD) {
        console.log('Location unchanged from last update');
        if (this.locationAttempts >= this.MAX_ATTEMPTS) {
          this.errorMessage = 'Unable to get a different location. This could be due to:\n' +
            '• Device is stationary\n' +
            '• GPS signal is weak\n' +
            '• Location services are not updating\n' +
            'Please select your location manually on the map.';
          this.isLocating = false;
          if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
          }
        }
        return;
      }

      this.lastLocation = newLocation;
      
      // Check accuracy
      if (newLocation.accuracy > this.MAX_ACCURACY) {
        console.log('Location accuracy too low:', newLocation.accuracy, 'meters');
        if (this.locationAttempts >= this.MAX_ATTEMPTS) {
          this.errorMessage = 'Unable to get accurate location. This could be due to:\n' +
            '• GPS signal is weak or blocked\n' +
            '• Device is indoors or underground\n' +
            '• Poor internet connection\n' +
            '• Device GPS hardware limitations\n' +
            'Please move to an open area or select your location manually on the map.';
          this.isLocating = false;
          if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
          }
        }
        return;
      }

      // Only update if we have valid coordinates
      if (this.isValidCoordinates(newLocation.lat, newLocation.lng)) {
        // Clear the watch since we got a valid location
        if (this.locationWatchId) {
          navigator.geolocation.clearWatch(this.locationWatchId);
          this.locationWatchId = null;
        }

        // Update location
        this.currentLocation = { lat: newLocation.lat, lng: newLocation.lng };
        this.hasInitialLocation = true;
        this.hasValidLocation = true;
        
        // Update map and marker
        if (this.map) {
          console.log('Updating map with new location...');
          
          // Remove existing marker if any
          if (this.marker) {
            console.log('Removing existing marker...');
            this.map.removeLayer(this.marker);
            this.marker = null;
          }

          // Create new marker
          console.log('Creating new marker at:', newLocation);
          this.marker = L.marker([newLocation.lat, newLocation.lng], {
            draggable: true,
            icon: L.divIcon({
              className: 'custom-marker',
              html: '<div style="background-color: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          }).addTo(this.map);

          // Add marker drag event
          this.marker.on('dragend', (event: L.DragEndEvent) => {
            const position = event.target.getLatLng();
            console.log('Marker dragged to:', position);
            this.updateLocation(position.lat, position.lng);
          });

          // Center map on new location with animation
          console.log('Centering map on new location...');
          this.map.flyTo([newLocation.lat, newLocation.lng], 16, {
            duration: 1.5
          });
        }

        // Update form values
        this.updateLocation(newLocation.lat, newLocation.lng);
        this.isLocating = false;
        this.forceLocationUpdate = false;
        this.cdr.detectChanges();
      } else {
        console.error('Invalid coordinates received:', newLocation);
        if (this.locationAttempts >= this.MAX_ATTEMPTS) {
          this.errorMessage = 'Invalid location received. Please select your location manually on the map.';
          this.isLocating = false;
          if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
          }
        }
      }
    }
  }

  private isValidCoordinates(lat: number, lng: number): boolean {
    // Check if coordinates are within reasonable bounds
    const isValidLat = lat >= -90 && lat <= 90;
    const isValidLng = lng >= -180 && lng <= 180;
    
    // Check if coordinates are not zero or near-zero
    const isNotZero = Math.abs(lat) > 0.0001 && Math.abs(lng) > 0.0001;
    
    console.log('Validating coordinates:', { 
      lat, 
      lng, 
      isValidLat, 
      isValidLng, 
      isNotZero
    });
    
    return isValidLat && isValidLng && isNotZero;
  }

  private updateLocation(lat: number, lng: number) {
    console.log('=== Updating Location ===');
    console.log('New coordinates:', { lat, lng });
    
    // Only update if we have valid coordinates
    if (!this.isValidCoordinates(lat, lng)) {
      console.error('Invalid coordinates:', { lat, lng });
      return;
    }
    
    // Update current location
    this.currentLocation = { lat, lng };
    this.hasValidLocation = true;
    
    // Update form values
    this.reportForm.patchValue({
      latitude: lat,
      longitude: lng
    }, { emitEvent: true });

    // Get address for the location
    console.log('Fetching address for coordinates:', { lat, lng });
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.display_name) {
          console.log('Got address:', data.display_name);
          this.ngZone.run(() => {
            this.reportForm.patchValue({
              location: data.display_name
            }, { emitEvent: true });
          });
        } else {
          console.log('No address found for coordinates');
        }
      })
      .catch(error => {
        console.error('Error getting address:', error);
      });
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedImage = file;
      this.createImagePreview(file);
      this.uploadImage(file);
    }
  }

  private createImagePreview(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.imagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  private uploadImage(file: File) {
    this.isSubmitting = true;
    this.errorMessage = '';

    this.cloudinaryService.uploadImage(file).subscribe({
      next: (response: any) => {
        console.log('=== Image Upload Debug ===');
        console.log('1. Cloudinary Response:', response);
        console.log('2. Secure URL:', response.secure_url);
        
        // Ensure we have a valid URL
        if (!response.secure_url) {
          console.error('No secure_url in Cloudinary response');
          this.errorMessage = 'Failed to get image URL from Cloudinary';
          this.isSubmitting = false;
          return;
        }

        // Update form with the secure URL
        this.reportForm.patchValue({
          imageUrl: response.secure_url
        });
        
        console.log('3. Updated form value:', this.reportForm.value);
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error uploading image:', error);
        this.errorMessage = 'Failed to upload image. Please try again.';
        this.isSubmitting = false;
      }
    });
  }

  async captureImage() {
    try {
      this.showCamera = true;
      await this.initializeCamera();
    } catch (error) {
      console.error('Error initializing camera:', error);
      this.errorMessage = 'Error accessing camera. Please make sure you have granted camera permissions.';
    }
  }

  private async initializeCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (this.videoElement && this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      throw error;
    }
  }

  async takePhoto() {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame on the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64 image
    const base64Image = canvas.toDataURL('image/jpeg');
    
    // Close camera
    this.closeCamera();

    // Create a File object from the base64 image
    const byteString = atob(base64Image.split(',')[1]);
    const mimeString = base64Image.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    const blob = new Blob([ab], { type: mimeString });
    const file = new File([blob], 'camera-photo.jpg', { type: mimeString });

    // Handle the captured image
    this.selectedImage = file;
    this.createImagePreview(file);
    await this.uploadImage(file);
  }

  closeCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.showCamera = false;
  }

  removeImage() {
    this.selectedImage = null;
    this.imagePreview = null;
    this.reportForm.patchValue({
      imageUrl: null
    });
  }

  private handleError(error: any): string {
    console.error('Detailed error:', error);
    
    if (error instanceof FirebaseError) {
      console.error('Firebase error code:', error.code);
      switch (error.code) {
        case 'permission-denied':
          return 'Permission denied. Please make sure you have the right permissions.';
        case 'unauthenticated':
          return 'You must be logged in to submit a report.';
        default:
          return `Firebase error: ${error.message}`;
      }
    }

    return error.message || 'An unexpected error occurred. Please try again.';
  }

  async onSubmit() {
    if (this.reportForm.invalid) {
      console.log('Form is invalid:', {
        errors: this.reportForm.errors,
        latitude: this.reportForm.get('latitude')?.errors,
        longitude: this.reportForm.get('longitude')?.errors,
        category: this.reportForm.get('category')?.errors,
        location: this.reportForm.get('location')?.errors,
        description: this.reportForm.get('description')?.errors
      });
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    if (!this.auth.currentUser) {
      this.errorMessage = 'You must be logged in to submit a report.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      console.log('=== Debug Information ===');
      console.log('1. Current user:', this.auth.currentUser);
      console.log('2. User ID:', this.auth.currentUser.uid);
      console.log('3. User email:', this.auth.currentUser.email);
      console.log('4. Form values:', this.reportForm.value);
      console.log('5. Image URL:', this.reportForm.get('imageUrl')?.value);

      // First, verify if the user document exists
      const userDocRef = doc(this.firestore, 'users', this.auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      console.log('6. User document exists:', userDoc.exists());
      if (userDoc.exists()) {
        console.log('7. User document data:', userDoc.data());
      }

      if (!userDoc.exists()) {
        console.log('Creating user document...');
        const newUser = {
          uid: this.auth.currentUser.uid,
          email: this.auth.currentUser.email,
          fullName: '',
          address: '',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          isActive: true,
          role: 'user',
          permissions: ['submit_report'],
          reportsSubmitted: 0,
          reportsResolved: 0
        };
        await setDoc(userDocRef, newUser);
        console.log('User document created successfully');
      }

      const reportData = {
        ...this.reportForm.value,
        timestamp: new Date(),
        status: 'pending',
        userId: this.auth.currentUser.uid,
        userEmail: this.auth.currentUser.email
      };
      console.log('8. Report data to be saved:', reportData);

      console.log('9. Attempting to save report...');
      const reportsCollection = collection(this.firestore, 'reports');
      console.log('10. Collection reference created');
      
      const docRef = await addDoc(reportsCollection, reportData);
      console.log('11. Report saved successfully with ID:', docRef.id);
      console.log('12. Final report data:', reportData);

      // Reset the map and form after successful submission
      this.reportForm.reset();
      this.selectedImage = null;
      this.imagePreview = null;
      
      // Reset map to initial state
      if (this.map && this.currentLocation) {
        this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 16);
        if (this.marker) {
          this.map.removeLayer(this.marker);
        }
        this.marker = null;
      }
      
      // Request current location again
      this.getCurrentLocation();

      // Show success dialog instead of alert
      this.showSuccessDialog = true;

    } catch (error: any) {
      console.error('=== Error Details ===');
      console.error('Error type:', error.constructor.name);
      if (error instanceof FirebaseError) {
        console.error('Firebase error code:', error.code);
        console.error('Firebase error message:', error.message);
        console.error('Firebase error details:', error);
      }
      this.errorMessage = this.handleError(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  onSuccessDialogConfirm() {
    this.showSuccessDialog = false;
    window.location.href = '/reports';
  }

  private async ensureUserDocument() {
    if (!this.auth.currentUser) return;

    try {
      const userDocRef = doc(this.firestore, 'users', this.auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log('Creating user document...');
        const newUser = {
          uid: this.auth.currentUser.uid,
          email: this.auth.currentUser.email,
          fullName: '',
          address: '',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          isActive: true,
          role: 'user',
          permissions: ['submit_report'],
          reportsSubmitted: 0,
          reportsResolved: 0
        };
        await setDoc(userDocRef, newUser);
        console.log('User document created successfully');
      } else {
        console.log('User document already exists');
      }
    } catch (error) {
      console.error('Error ensuring user document:', error);
    }
  }

  searchLocation(input: HTMLInputElement) {
    const query = input.value.trim();
    
    if (!query) {
      return;
    }

    this.isSearching = true;
    this.errorMessage = '';

    // Use OpenStreetMap Nominatim API for geocoding
    this.http.get<NominatimResult[]>(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
      .subscribe({
        next: (results) => {
          if (results && results.length > 0) {
            const location = results[0];
            const lat = parseFloat(location.lat);
            const lng = parseFloat(location.lon);
            
            // Update map and marker
            if (this.map) {
              this.map.setView([lat, lng], 16);
              this.marker = L.marker([lat, lng], {
                draggable: true,
                icon: L.divIcon({
                  className: 'custom-marker',
                  html: '<div style="background-color: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10]
                })
              }).addTo(this.map);
              this.updateLocation(lat, lng);
            }
          } else {
            this.errorMessage = 'Location not found. Please try a different search term.';
          }
        },
        error: (error) => {
          console.error('Error searching location:', error);
          this.errorMessage = 'Error searching location. Please try again.';
        },
        complete: () => {
          this.isSearching = false;
        }
      });
  }

  // Add cleanup for location watch
  ngOnDestroy() {
    if (this.locationWatchId) {
      navigator.geolocation.clearWatch(this.locationWatchId);
    }
  }
}

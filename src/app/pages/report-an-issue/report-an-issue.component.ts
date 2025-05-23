import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, NgZone, OnInit, ViewChild, inject } from '@angular/core';
import { FirebaseError } from '@angular/fire/app';
import { Auth } from '@angular/fire/auth';
import { Firestore, addDoc, collection, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CloudinaryService } from '../../services/cloudinary.service';

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
    HttpClientModule
  ],
  providers: [CloudinaryService],
  templateUrl: './report-an-issue.component.html',
  styleUrls: ['./report-an-issue.component.css']
})
export class ReportAnIssueComponent implements OnInit, AfterViewInit {
  private firestore: Firestore = inject(Firestore);
  private auth: Auth = inject(Auth);
  private http: HttpClient = inject(HttpClient);
  
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  reportForm: FormGroup;
  username: string = 'User';
  currentLocation: { lat: number; lng: number } = { lat: 14.832005, lng: 120.282648 }; // Default coordinates
  isSubmitting: boolean = false;
  errorMessage: string = '';
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  map: L.Map | null = null;
  marker: L.Marker | null = null;
  isLocating: boolean = false;
  isSearching: boolean = false;

  constructor(
    private fb: FormBuilder,
    private ngZone: NgZone,
    private cloudinaryService: CloudinaryService
  ) {
    this.reportForm = this.fb.group({
      category: ['', Validators.required],
      location: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      latitude: [null, Validators.required],
      longitude: [null, Validators.required],
      imageUrl: [null]
    });
  }

  ngOnInit() {
    this.ensureUserDocument();
  }

  ngAfterViewInit() {
    // Initialize map and immediately request location
    this.initializeMap();
    this.requestLocationPermission();
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

      // Initialize map with default coordinates
      this.map = L.map(this.mapContainer.nativeElement, {
        zoomControl: true,
        attributionControl: true,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true
      }).setView([this.currentLocation.lat, this.currentLocation.lng], 14.5);

      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(this.map);

      // Create marker at the default location
      this.marker = L.marker([this.currentLocation.lat, this.currentLocation.lng], {
        draggable: true
      }).addTo(this.map);

      // Add marker drag event
      this.marker.on('dragend', (event: L.DragEndEvent) => {
        const position = event.target.getLatLng();
        this.updateLocation(position.lat, position.lng);
      });

      // Add click event to map
      this.map.on('click', (event: L.LeafletMouseEvent) => {
        const { lat, lng } = event.latlng;
        this.updateLocation(lat, lng);
        if (this.marker) {
          this.marker.setLatLng([lat, lng]);
        }
      });

    } catch (error) {
      console.error('Error initializing map:', error);
      this.errorMessage = 'Error initializing map. Please refresh the page.';
    }
  }

  private async requestLocationPermission() {
    try {
      if (!navigator.geolocation) {
        this.errorMessage = 'Geolocation is not supported by your browser.';
        this.useDefaultLocation();
        return;
      }

      const permission = await navigator.permissions.query({ name: 'geolocation' });
      
      if (permission.state === 'denied') {
        this.errorMessage = 'Location permission is denied. Please enable it in your browser settings.';
        this.useDefaultLocation();
        return;
      }

      // Always try to get current location, even if we've tried before
      this.getCurrentLocation();
    } catch (error) {
      console.error('Error requesting location permission:', error);
      this.errorMessage = 'Error requesting location permission. Using default location.';
      this.useDefaultLocation();
    }
  }

  private useDefaultLocation() {
    this.updateLocation(14.832005, 120.282648);
    if (this.map && this.marker) {
      this.marker.setLatLng([14.832005, 120.282648]);
      this.map.setView([14.832005, 120.282648], 14.5);
    }
  }

  getCurrentLocation() {
    this.isLocating = true;
    this.errorMessage = '';

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.ngZone.run(() => {
          console.log('Received GPS coordinates:', position.coords);
          
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          // Update the current location
          this.currentLocation = newLocation;

          // Ensure map and marker exist
          if (this.map && this.marker) {
            // Update marker position
            this.marker.setLatLng([newLocation.lat, newLocation.lng]);
            
            // Pan the map to the new location
            this.map.setView([newLocation.lat, newLocation.lng], 16, {
              animate: true,
              duration: 1
            });

            // Update form values
            this.updateLocation(newLocation.lat, newLocation.lng);
          }

          this.isLocating = false;
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        this.ngZone.run(() => {
          this.errorMessage = this.getLocationErrorMessage(error);
          this.isLocating = false;
          this.useDefaultLocation();
        });
      },
      options
    );
  }

  private getLocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location access denied. Please enable location services in your browser settings and click the refresh button.';
      case error.POSITION_UNAVAILABLE:
        return 'Location information is unavailable. Please try again.';
      case error.TIMEOUT:
        return 'Location request timed out. Please try again.';
      default:
        return 'An error occurred while getting your location. Please try again.';
    }
  }

  private updateLocation(lat: number, lng: number) {
    this.currentLocation = { lat, lng };
    
    // Update form values
    this.reportForm.patchValue({
      latitude: lat,
      longitude: lng
    });

    // Use OpenStreetMap Nominatim for reverse geocoding
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    
    fetch(url, {
      headers: {
        'Accept-Language': 'en-US,en;q=0.9' // Request English results
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.display_name) {
          this.ngZone.run(() => {
            this.reportForm.patchValue({
              location: data.display_name
            });
          });
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      // Convert canvas to base64
      const base64Image = canvas.toDataURL('image/jpeg');
      this.imagePreview = base64Image;

      // Upload the base64 image
      this.uploadBase64Image(base64Image);

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('Error accessing camera:', error);
      this.errorMessage = 'Unable to access camera. Please check your permissions.';
    }
  }

  private uploadBase64Image(base64Image: string) {
    this.isSubmitting = true;
    this.errorMessage = '';

    this.cloudinaryService.uploadImageFromBase64(base64Image).subscribe({
      next: (response: any) => {
        console.log('Image uploaded successfully:', response);
        this.reportForm.patchValue({
          imageUrl: response.secure_url
        });
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error uploading image:', error);
        this.errorMessage = 'Failed to upload image. Please try again.';
        this.isSubmitting = false;
      }
    });
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
      if (this.map && this.marker) {
        this.map.setView([14.832, 120.2820], 14.5);
        this.marker.setLatLng([14.832, 120.2820]);
      }
      
      // Request current location again
      this.requestLocationPermission();

      // Show success message
      alert('Report submitted successfully!');

      // Reload the page and redirect to reports dashboard
      window.location.href = '/reports';

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
            if (this.map && this.marker) {
              this.map.setView([lat, lng], 15);
              this.marker.setLatLng([lat, lng]);
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
}

import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, NgZone, OnInit, ViewChild, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { User } from '../../interfaces/user.interface';
import { AuthService } from '../../services/auth.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { ReportService } from '../../services/report.service';
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
  user: User | null = null;
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
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };
  private readonly MAX_ACCURACY = 500;
  private readonly MIN_ACCURACY = 0;
  private readonly MAX_ATTEMPTS = 3;
  private readonly LOCATION_THRESHOLD = 0.0001;
  private isInitialized = false;
  private locationAttempts = 0;
  private lastLocation: { lat: number; lng: number; accuracy: number } | null = null;
  private mapInitialized = false;
  private forceLocationUpdate = false;
  private hasValidLocation = false;
  private isFirstLoad = true;
  showSuccessDialog = false;
  selectedFiles: File[] = [];
  previewUrls: string[] = [];
  maxFileSize: number = 5 * 1024 * 1024; // 5MB
  maxFiles: number = 5;
  allowedFileTypes: string[] = ['image/jpeg', 'image/png', 'image/gif'];
  private readonly ACCURACY_THRESHOLD = 100;
  private readonly ACCURACY_IMPROVEMENT_THRESHOLD = 1000;
  private readonly MIN_ACCURACY_IMPROVEMENT = 100;
  private readonly ACCURACY_WARNING_THRESHOLD = 200;
  private lastAccuracy: number | null = null;
  private locationAccuracy: number | null = null;
  private isLowAccuracy: boolean = false;
  private searchQuery = '';

  constructor(
    private fb: FormBuilder,
    private ngZone: NgZone,
    private cloudinaryService: CloudinaryService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
    private reportService: ReportService,
    private router: Router,
    private authService: AuthService
  ) {
    this.reportForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1000)]],
      category: ['', Validators.required],
      priority: ['medium', Validators.required],
      address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
      location: ['']
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

    // Check if user is authenticated
    if (!this.userService.isAuthenticated()) {
      this.router.navigate(['/sign-in']);
    }

    this.authService.getCurrentUser().subscribe(user => {
      this.user = user;
    });
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
      
      // Create bounds for Olongapo City
      const olongapoBounds = L.latLngBounds(
        [this.OLONGAPO_BOUNDS.south, this.OLONGAPO_BOUNDS.west],
        [this.OLONGAPO_BOUNDS.north, this.OLONGAPO_BOUNDS.east]
      );
      
      // Initialize map with strict bounds
      this.map = L.map(this.mapContainer.nativeElement, {
        zoomControl: true,
        attributionControl: true,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
        center: [14.8386, 120.2847], // Olongapo City center
        zoom: 13,
        minZoom: 12, // Increased minimum zoom to keep focus on Olongapo
        maxZoom: 19,
        maxBounds: olongapoBounds, // Restrict panning to Olongapo
        maxBoundsViscosity: 1.0 // Prevent panning outside bounds
      });

      // Add tile layer with error handling
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        subdomains: 'abc',
        bounds: olongapoBounds // Restrict tile loading to Olongapo
      }).addTo(this.map);

      // Add controls
      L.control.zoom({ position: 'bottomright' }).addTo(this.map);
      L.control.scale({ imperial: false, position: 'bottomright' }).addTo(this.map);

      // Add Olongapo City boundary with more visible styling
      L.rectangle(olongapoBounds, {
        color: "#ff7800",
        weight: 3,
        fillOpacity: 0.1,
        dashArray: '5, 5'
      }).addTo(this.map);

      // Add a label for Olongapo City
      L.marker([14.8386, 120.2847]).addTo(this.map)
        .bindPopup('Olongapo City, Zambales')
        .openPopup();

      // Enable locate control with restricted bounds
      this.map.locate({
        setView: true,
        maxZoom: 16,
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
        bounds: olongapoBounds
      });

      // Handle location found event
      this.map.on('locationfound', (e: L.LocationEvent) => {
        console.log('Location found:', e);
        this.handleLocationUpdate({
          coords: {
            latitude: e.latlng.lat,
            longitude: e.latlng.lng,
            accuracy: e.accuracy,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        } as GeolocationPosition);
      });

      // Handle location error event
      this.map.on('locationerror', (e: L.ErrorEvent) => {
        console.error('Location error:', e);
        this.handleLocationError({
          code: e.code,
          message: e.message,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3
        } as GeolocationPositionError);
      });

      // Add click event to map
      this.map.on('click', (event: L.LeafletMouseEvent) => {
        const { lat, lng } = event.latlng;
        if (this.isWithinOlongapo(lat, lng)) {
          this.updateLocation(lat, lng);
          this.isLowAccuracy = false;
          this.locationAccuracy = 10;
        } else {
          this.errorMessage = 'Please select a location within Olongapo City, Zambales.';
        }
      });

      // Prevent zooming out too far
      this.map.on('zoomend', () => {
        if (this.map && this.map.getZoom() < 12) {
          this.map.setZoom(12);
        }
      });

      this.mapInitialized = true;
      console.log('Map initialized successfully');

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
        this.errorMessage = 'Location access denied. Please:\n' +
          '• Enable location services in your browser settings\n' +
          '• Allow location access for this website\n' +
          '• Or select your location manually on the map';
        break;
      case error.POSITION_UNAVAILABLE:
        this.errorMessage = 'Location information is unavailable. Please:\n' +
          '• Move to an open area with clear sky view\n' +
          '• Ensure GPS is enabled on your device\n' +
          '• Check your internet connection\n' +
          '• Or select your location manually on the map';
        break;
      case error.TIMEOUT:
        if (this.locationAttempts < this.MAX_ATTEMPTS) {
          console.log('Location timeout, trying again...');
          setTimeout(() => this.getCurrentLocation(), 1000);
          return;
        }
        this.errorMessage = 'Location request timed out. Please:\n' +
          '• Move to an area with better GPS signal\n' +
          '• Ensure you have a stable internet connection\n' +
          '• Or select your location manually on the map';
        break;
      default:
        this.errorMessage = 'An error occurred while getting your location. Please:\n' +
          '• Refresh the page\n' +
          '• Check your device\'s GPS settings\n' +
          '• Ensure you have a stable internet connection\n' +
          '• Or select your location manually on the map';
    }
    this.isLocating = false;
    this.cdr.detectChanges();
  }

  private handleLocationUpdate(position: GeolocationPosition) {
    this.locationAttempts++;
    console.log(`Location update (Attempt ${this.locationAttempts}):`, position);
    
    if (position.coords) {
      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      console.log('New location:', newLocation);

      // Check if location is within Olongapo City
      if (!this.isWithinOlongapo(newLocation.lat, newLocation.lng)) {
        this.errorMessage = 'Your location is outside Olongapo City, Zambales. ' +
          'Please ensure you are within the city limits or select a location on the map.';
        this.isLocating = false;
        return;
      }

      // Store accuracy
      this.locationAccuracy = newLocation.accuracy;
      this.isLowAccuracy = newLocation.accuracy > this.ACCURACY_WARNING_THRESHOLD;

      // If accuracy is too low and we haven't reached max attempts, try again
      if (newLocation.accuracy > this.MAX_ACCURACY && this.locationAttempts < this.MAX_ATTEMPTS) {
        console.log(`Accuracy too low (${newLocation.accuracy}m), trying again...`);
        setTimeout(() => this.getCurrentLocation(), 1000);
        return;
      }

      // Update location
      this.currentLocation = { lat: newLocation.lat, lng: newLocation.lng };
      
      // Update map if it's initialized
      if (this.mapInitialized && this.map) {
        this.updateMapWithLocation(this.currentLocation);
      } else {
        console.error('Map not initialized when trying to update location');
        this.initializeMap();
      }

      // Update form values
      this.updateLocation(newLocation.lat, newLocation.lng);
      this.isLocating = false;
      this.cdr.detectChanges();

      // Show accuracy message
      if (this.isLowAccuracy) {
        this.errorMessage = `Note: Location accuracy is ${Math.round(newLocation.accuracy)} meters. ` +
          'For better accuracy:\n' +
          '• Move to an open area with clear sky view\n' +
          '• Ensure GPS is enabled on your device\n' +
          '• Or manually select your location on the map';
      }
    }
  }

  private updateMapWithLocation(location: L.LatLng) {
    if (!this.map) return;

    console.log('Updating map with location:', location);

    // Remove existing marker
    if (this.marker) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }

    // Create new marker
    this.marker = L.marker([location.lat, location.lng], {
      draggable: true
    }).addTo(this.map);

    // Add marker drag event
    this.marker.on('dragend', (event: L.DragEndEvent) => {
      const position = event.target.getLatLng();
      this.updateLocation(position.lat, position.lng);
      this.isLowAccuracy = false;
      this.locationAccuracy = 10;
    });

    // Calculate zoom level based on accuracy
    let zoomLevel = 16;
    if (this.locationAccuracy) {
      if (this.locationAccuracy > 100000) zoomLevel = 8;
      else if (this.locationAccuracy > 10000) zoomLevel = 10;
      else if (this.locationAccuracy > 1000) zoomLevel = 12;
      else if (this.locationAccuracy > 100) zoomLevel = 14;
    }

    // Center map
    this.map.flyTo([location.lat, location.lng], zoomLevel, {
      duration: 1.5
    });
  }

  private isWithinOlongapo(lat: number, lng: number): boolean {
    return lat >= this.OLONGAPO_BOUNDS.south &&
           lat <= this.OLONGAPO_BOUNDS.north &&
           lng >= this.OLONGAPO_BOUNDS.west &&
           lng <= this.OLONGAPO_BOUNDS.east;
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
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'StreetFix/1.0'
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

  private isValidCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const newFiles = Array.from(input.files);
      
      // Check if adding new files would exceed the limit
      if (this.selectedFiles.length + newFiles.length > this.maxFiles) {
        this.errorMessage = `You can only upload up to ${this.maxFiles} files.`;
        return;
      }

      // Validate each file
      for (const file of newFiles) {
        if (!this.allowedFileTypes.includes(file.type)) {
          this.errorMessage = 'Only JPG, PNG, and GIF files are allowed.';
          return;
        }
        if (file.size > this.maxFileSize) {
          this.errorMessage = 'Each file must be less than 5MB.';
          return;
        }
      }

      // Add valid files
      this.selectedFiles.push(...newFiles);
      this.errorMessage = '';

      // Generate previews
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.previewUrls.push(e.target.result);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previewUrls.splice(index, 1);
  }

  async onSubmit(): Promise<void> {
    if (this.reportForm.invalid) {
      this.markFormGroupTouched(this.reportForm);
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.isLocating = true;

    try {
      // First get the user's location
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            this.handleLocationUpdate(position);
            resolve();
          },
          (error) => {
            this.handleLocationError(error);
            reject(error);
          },
          this.GEOLOCATION_OPTIONS
        );
      });

      const formData = this.reportForm.value;
      const user = await this.userService.getCurrentUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const reportData = {
        ...formData,
        userId: user.uid,
        userEmail: user.email,
        status: 'pending',
        createdAt: new Date().toISOString(),
        images: [] as string[]
      };

      // Upload images if any
      if (this.selectedFiles.length > 0) {
        const uploadPromises = this.selectedFiles.map(file => 
          this.reportService.uploadImage(file)
        );
        reportData.images = await Promise.all(uploadPromises);
      }

      await this.reportService.createReport(reportData);
      this.successMessage = 'Report submitted successfully!';
      this.reportForm.reset();
      this.selectedFiles = [];
      this.previewUrls = [];

      // Redirect to reports page after 2 seconds
      setTimeout(() => {
        this.router.navigate(['/reports']);
      }, 2000);

    } catch (error: any) {
      this.errorMessage = error.message || 'An error occurred while submitting the report.';
    } finally {
      this.isSubmitting = false;
      this.isLocating = false;
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  startLocationSearch() {
    console.log('Starting location search...');
    this.isLocating = true;
    this.errorMessage = '';
    this.locationAttempts = 0;
    this.getCurrentLocation();
  }

  private cleanupMap() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    if (this.marker) {
      this.marker = null;
    }
  }

  private stopLocationWatch() {
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }
  }

  searchLocation() {
    if (!this.searchQuery || this.isSearching) return;

    this.isSearching = true;
    this.errorMessage = '';

    // Implement location search using a geocoding service
    // For now, we'll just show an error
    this.errorMessage = 'Location search not implemented';
    this.isSearching = false;
  }

  // Olongapo City boundaries with tighter bounds
  private readonly OLONGAPO_BOUNDS = {
    north: 14.9167,
    south: 14.7833,
    east: 120.3167,
    west: 120.2333
  };
}

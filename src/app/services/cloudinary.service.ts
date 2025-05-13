import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  format: string;
  resource_type: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class CloudinaryService {
  private cloudName = 'dxtd1kqq3'; // Your cloud name
  private uploadPreset = 'upload_image_streetfix'; // Your upload preset
  private uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

  constructor(private http: HttpClient) {
    console.log('CloudinaryService initialized with:', {
      cloudName: this.cloudName,
      uploadPreset: this.uploadPreset,
      uploadUrl: this.uploadUrl
    });
  }

  uploadImage(file: File): Observable<CloudinaryResponse> {
    console.log('Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('cloud_name', this.cloudName);

    return this.http.post<CloudinaryResponse>(this.uploadUrl, formData).pipe(
      tap(response => {
        console.log('Cloudinary upload response:', response);
        if (response && response.secure_url) {
          console.log('Secure URL:', response.secure_url);
        }
      }),
      catchError(error => {
        console.error('Error uploading image to Cloudinary:', error);
        return throwError(() => new Error('Failed to upload image to Cloudinary'));
      })
    );
  }

  uploadImageFromBase64(base64Image: string): Observable<CloudinaryResponse> {
    console.log('Uploading base64 image, length:', base64Image.length);
    
    const formData = new FormData();
    formData.append('file', base64Image);
    formData.append('upload_preset', this.uploadPreset);
    formData.append('cloud_name', this.cloudName);

    return this.http.post<CloudinaryResponse>(this.uploadUrl, formData).pipe(
      tap(response => {
        console.log('Cloudinary base64 upload response:', response);
        if (response && response.secure_url) {
          console.log('Secure URL:', response.secure_url);
        }
      }),
      catchError(error => {
        console.error('Error uploading base64 image to Cloudinary:', error);
        return throwError(() => new Error('Failed to upload image to Cloudinary'));
      })
    );
  }
} 
import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  HostListener,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { MenuManager } from '../../../../components/menu-bar/menu-manager/menu-manager';
import { ShopLocationService, ShopLocation } from '../../../../service/api/shop-location.service';

declare const L: any; // มาจาก CDN ที่โหลดใน index.html

@Component({
  selector: 'app-manage-shop-location',
  standalone: true,
  imports: [CommonModule, MenuManager, ToastModule, ButtonModule, RippleModule],
  templateUrl: './manage-shop-location.html',
  styleUrl: './manage-shop-location.scss',
})
export class ManageShopLocation implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapBox') mapBoxRef!: ElementRef<HTMLDivElement>;

  private map: any;
  private marker: any;
  private radiusCircle: any;
  private resizeTimeout: any;

  selectedLat: number | null = null;
  selectedLng: number | null = null;
  isSaving = false;
  isMapLoading = true;
  hasExistingLocation = false;

  private readonly RADIUS_METERS = 1000;
  private readonly DEFAULT_LAT = 13.7563;
  private readonly DEFAULT_LNG = 100.5018;

  constructor(
    private shopLocationService: ShopLocationService,
    private messageService: MessageService,
    private router: Router,
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.initMap();
    this.loadExistingLocation();
  }

  goBackToShop(): void {
    this.router.navigate(['/ManageShop']);
  }

  // ป้องกันแผนที่เพี้ยน/เทา เวลาหมุนจอมือถือ หรือย่อขยายจอ
  @HostListener('window:resize')
  onWindowResize(): void {
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => this.map?.invalidateSize(), 200);
  }

  private initMap(): void {
    this.map = L.map('shop-map').setView([this.DEFAULT_LAT, this.DEFAULT_LNG], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.map.on('click', (e: any) => {
      this.setPin(e.latlng.lat, e.latlng.lng);
    });

    setTimeout(() => this.map.invalidateSize(), 300);
  }

  private loadExistingLocation(): void {
    this.shopLocationService.getLocation().subscribe({
      next: (loc: ShopLocation) => {
        if (loc && loc.latitude && loc.longitude) {
          this.hasExistingLocation = true;
          this.setPin(loc.latitude, loc.longitude);
          this.map.flyTo([loc.latitude, loc.longitude], 17, { duration: 1 });
          this.scrollMapIntoView();
          this.isMapLoading = false;
        } else {
          this.autoDetectCurrentLocation();
        }
      },
      error: () => {
        this.autoDetectCurrentLocation();
      },
    });
  }

  private autoDetectCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.setPin(pos.coords.latitude, pos.coords.longitude);
          this.map.flyTo([pos.coords.latitude, pos.coords.longitude], 17, { duration: 1 });
          this.isMapLoading = false;
        },
        (error) => {
          // ถ้าผู้ใช้ปฏิเสธการเข้าถึงตำแหน่ง GPS หรือหาไม่พบ
          this.isMapLoading = false;
          this.messageService.add({
            severity: 'info',
            summary: 'คำแนะนำ',
            detail: 'กรุณาคลิกบนแผนที่เพื่อปักหมุดตำแหน่งร้านของคุณ',
          });
        },
        { timeout: 8000, enableHighAccuracy: true },
      );
    } else {
      this.isMapLoading = false;
    }
  }

  private scrollMapIntoView(): void {
    setTimeout(() => {
      this.mapBoxRef?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.map.invalidateSize();
    }, 150);
  }

  private setPin(lat: number, lng: number): void {
    this.selectedLat = lat;
    this.selectedLng = lng;

    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
      this.marker.on('dragend', () => {
        const pos = this.marker.getLatLng();
        this.selectedLat = pos.lat;
        this.selectedLng = pos.lng;
        this.updateRadiusCircle(pos.lat, pos.lng);
      });
    }

    this.updateRadiusCircle(lat, lng);
  }

  private updateRadiusCircle(lat: number, lng: number): void {
    if (this.radiusCircle) {
      this.radiusCircle.setLatLng([lat, lng]);
    } else {
      this.radiusCircle = L.circle([lat, lng], {
        radius: this.RADIUS_METERS,
        color: '#ffca28',
        fillColor: '#ffca28',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(this.map);
    }
  }

  useMyCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.messageService.add({
        severity: 'warn',
        summary: 'ไม่รองรับ',
        detail: 'เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง',
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.setPin(pos.coords.latitude, pos.coords.longitude);
        this.map.flyTo([pos.coords.latitude, pos.coords.longitude], 17, { duration: 1 });
      },
      () => {
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'ไม่สามารถระบุตำแหน่งปัจจุบันได้ กรุณาปักหมุดเองบนแผนที่',
        });
      },
    );
  }

  saveLocation(): void {
    if (this.selectedLat === null || this.selectedLng === null) {
      this.messageService.add({
        severity: 'warn',
        summary: 'กรอกข้อมูลไม่ครบ',
        detail: 'กรุณาปักหมุดตำแหน่งร้านบนแผนที่ก่อน',
      });
      return;
    }
    this.isSaving = true;

    this.shopLocationService.updateLocation(this.selectedLat, this.selectedLng).subscribe({
      next: () => {
        this.isSaving = false;
        this.hasExistingLocation = true;
        this.messageService.add({
          severity: 'success',
          summary: 'สำเร็จ',
          detail: 'บันทึกตำแหน่งร้านเรียบร้อยแล้ว',
        });
      },
      error: () => {
        this.isSaving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'บันทึกไม่สำเร็จ กรุณาลองใหม่',
        });
      },
    });
  }

  ngOnDestroy(): void {
    clearTimeout(this.resizeTimeout);
    if (this.map) {
      this.map.remove();
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CarouselModule } from 'primeng/carousel';
import { Subscription } from 'rxjs';
import { ConfigService } from '../../../service/api/config.service';
import { DiscountService } from '../../../service/api/discount.service';
import { ImageService } from '../../../service/api/image.service';
import { SignalrService } from '../../../service/api/signalr.service';

@Component({
  selector: 'app-display-checkout',
  imports: [CommonModule, MatIconModule, CarouselModule],
  templateUrl: './display-checkout.html',
  styleUrl: './display-checkout.scss',
})
export class DisplayCheckout implements OnInit, OnDestroy {
  resData: any;
  discountData: any[] = [];
  banners: { image: string }[] = [];
  posterUrl: string | null = null;
  currentBannerIndex: number = 0;
  slideInterval: number = 5000;

  displayData: any = null;
  isPaidSuccess: boolean = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private signalRService: SignalrService,
    private configService: ConfigService,
    private discountService: DiscountService,
    private imageService: ImageService
  ) {}

  // Lifecycle Hooks
  ngOnInit() {
    this.loadIndexData();

    const configSub = this.signalRService.resConfig$.subscribe((updatedConfig) => {
      this.resData = updatedConfig;
    });
    this.subscriptions.push(configSub);

    const imgSub = this.signalRService.resImageUpdate$.subscribe(() => {
      this.loadImages();
    });
    this.subscriptions.push(imgSub);

    this.signalRService.on('ShowCustomerDisplay', (data: any) => {
      if (data) {
        if (data.isPaidSuccess) {
          this.triggerSuccess();
          return;
        }

        this.isPaidSuccess = false;
        data.parsedQrUrl = this.parseQrCodeData(data);
        this.displayData = data;
      }
    });

    this.signalRService.on('ClearCustomerDisplay', () => {
      this.displayData = null;
      this.isPaidSuccess = false;
    });

    if (this.signalRService.billUpdated$) {
      const sub = this.signalRService.billUpdated$.subscribe((data: any) => {
        if (data && data.status === 'CLOSED') {
          this.triggerSuccess();
        }
      });
      this.subscriptions.push(sub);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  // Data Loading Methods
  loadIndexData() {
    this.configService.getConfig().subscribe((res) => {
      if (res && res.length > 0) this.resData = res[0];
    });

    this.discountService.getDiscount().subscribe((res) => {
      this.discountData = res;
    });

    this.loadImages();
  }

  loadImages(): void {
    this.imageService.getImages().subscribe({
      next: (images: any[]) => {
        this.banners = images
          .filter((img) => img.image_Type === 'Banner')
          .map((img) => ({ image: img.image_Url }));

        const poster = images.find((img) => img.image_Type === 'Poster');
        this.posterUrl = poster ? poster.image_Url : null;
      },
      error: () => {
        this.banners = [
          { image: 'assets/Images/Banner.png' },
          { image: 'assets/Images/Banner2.png' },
          { image: 'assets/Images/Banner3.png' },
        ];
      },
    });
  }

  // Helper Methods
  parseQrCodeData(data: any): string {
    if (!data || !data.qrData) return '';

    try {
      const parsed = typeof data.qrData === 'string' ? JSON.parse(data.qrData) : data.qrData;
      const rawQr = parsed.data?.qr_url || parsed.data?.qrImage || parsed.qr_data || data.qrData;

      if (rawQr && typeof rawQr === 'string' && !rawQr.startsWith('http') && !rawQr.startsWith('data:image')) {
        return `data:image/png;base64,${rawQr}`;
      }

      return rawQr;
    } catch (e) {
      return data.qrData;
    }
  }

  onClicksmailPictures(index: number) {
    this.currentBannerIndex = index;
  }

  onBannerChange(event: any) {
    this.currentBannerIndex = event.page;
  }

  triggerSuccess() {
    if (this.isPaidSuccess) return;
    
    setTimeout(() => {
    this.isPaidSuccess = true;

    setTimeout(() => {
      this.isPaidSuccess = false;
      this.displayData = null;
    }, 6000); 

  }, 2000);
  }
}
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IndexNavbar } from '../components/menu-bar/index-navbar/index-navbar';
import { CarouselModule } from 'primeng/carousel';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { MenuMember } from '../components/menu-bar/menu-member/menu-member';
import { ConfigService } from '../service/api/config.service';
import { SignalrService } from '../service/api/signalr.service';
import { ImageService } from '../service/api/image.service';
import { Subscription } from 'rxjs';
import { DiscountService } from '../service/api/discount.service';
import { Discount } from '../models/discount.model';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'app-index',
  standalone: true,
  imports: [
    CommonModule,
    IndexNavbar,
    CarouselModule,
    ButtonModule,
    RippleModule,
    MenuMember,
    DialogModule,
  ],
  templateUrl: './index.html',
  styleUrl: './index.scss',
})
export class Index implements OnInit, OnDestroy {
  currentBannerIndex: number = 0;
  slideInterval: number = 5000;
  slideTimer: any;
  isLoggedIn: boolean = false;
  resData: any;
  discountData: Discount[] = [];
  displayDiscountDialog: boolean = false;
  selectedDiscount: Discount | null = null;
  banners: { image: string }[] = [];
  posterUrl: string | null = null;

  private resConfigSub!: Subscription;
  private resImageSub!: Subscription;
  private resDiscountSub!: Subscription;

  constructor(
    private ConfigService: ConfigService,
    private DiscountService: DiscountService,
    private signalRService: SignalrService,
    private imageService: ImageService,
  ) {}

  ngOnInit() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    this.isLoggedIn = !!token;

    // ราคา / config
    this.ConfigService.getConfig().subscribe((res) => {
      this.resData = res[0];
    });

    // realtime: ราคาเปลี่ยน
    this.resConfigSub = this.signalRService.resConfig$.subscribe((updatedConfig) => {
      this.resData = updatedConfig;
    });

    // โหลดข้อมูลส่วนลดครั้งแรก
    this.loadDiscounts();

    // realtime: ส่วนลดเปลี่ยน — โหลดใหม่อัตโนมัติ
    this.resDiscountSub = this.signalRService.resDiscountUpdate$.subscribe(() => {
      this.loadDiscounts();
    });

    // realtime: รูปภาพเปลี่ยน — โหลดใหม่อัตโนมัติ
    this.resImageSub = this.signalRService.resImageUpdate$.subscribe(() => {
      this.loadImages();
    });

    this.loadImages();
  }

  loadDiscounts(): void {
    this.DiscountService.getDiscount().subscribe({
      next: (res) => {
        this.discountData = res;

        // ถ้ากำลังเปิด Popup ส่วนลดตัวไหนอยู่ ให้อัปเดตข้อมูลตัวนั้นใน Popup แบบ Realtime ด้วย
        if (this.selectedDiscount) {
          const updatedSelected = this.discountData.find(
            (item) => item.discount_id === this.selectedDiscount?.discount_id,
          );
          if (updatedSelected) {
            this.selectedDiscount = updatedSelected;
          } else {
            // กรณีคูปองใบที่เปิดอยู่นั้นถูกเจ้าของร้านลบออกไป ให้ปิด Popup อัตโนมัติ
            this.displayDiscountDialog = false;
            this.selectedDiscount = null;
          }
        }
      },
      error: (err) => {
        console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลส่วนลด:', err);
      },
    });
  }

  showDiscountDetail(discount: Discount) {
    this.selectedDiscount = discount;
    this.displayDiscountDialog = true;
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

  ngOnDestroy() {
    this.resConfigSub?.unsubscribe();
    this.resImageSub?.unsubscribe();
    this.resDiscountSub?.unsubscribe();
  }

  onClicksmailPictures(index: number) {
    if (this.slideTimer) clearInterval(this.slideTimer);
    this.currentBannerIndex = index;
    this.slideInterval = 0;
  }

  onBannerChange(event: any) {
    this.currentBannerIndex = event.page;
  }

  scrollToSection(element: HTMLElement): void {
    element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
  }
}

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuManager } from '../../../components/menu-bar/menu-manager/menu-manager';
import { MessageService, ConfirmationService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ImageService } from '../../../service/api/image.service';
import { ConfigService } from '../../../service/api/config.service';

interface ImageItem {
  url: string | ArrayBuffer | null;
  file?: File;
}

interface ResImage {
  image_id: number;
  image_Url: string;
  image_Type: string;
}

interface ConfigForm {
  config_id: number;
  res_name: string;
  res_phone: string;
  price_Adult: number;
  price_Child: number;
  fine: number;
}

@Component({
  selector: 'app-manage-shop',
  standalone: true,
  imports: [
    MenuManager,
    CommonModule,
    FormsModule,
    ToastModule,
    ButtonModule,
    RippleModule,
    ConfirmDialogModule,
    InputTextModule,
    InputNumberModule,
  ],
  templateUrl: './manage-shop.html',
  styleUrl: './manage-shop.scss',
  providers: [ConfirmationService],
})
export class ManageShop implements OnInit {
  // ---- Config ----
  configForm: ConfigForm = {
    config_id: 0,
    res_name: '',
    res_phone: '',
    price_Adult: 0,
    price_Child: 0,
    fine: 0,
  };

  // ---- รูปจาก DB ----
  currentBanners: ResImage[] = [];
  currentPoster: ResImage | null = null;

  // ---- รูปใหม่รอ Upload ----
  newBanners: ImageItem[] = [];
  newPoster: ImageItem | null = null;

  isLoading = false;

  constructor(
    private messageService: MessageService,
    private imageService: ImageService,
    private configService: ConfigService,
    private confirmationService: ConfirmationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadConfig();
    this.loadImages();
  }

  // ไปหน้าตั้งค่าส่วนลด
  goToDiscountSettings(): void {
    this.router.navigate(['/ManageDiscount']);
  }

  goToLocationSettings(): void {
    this.router.navigate(['/ManageShopLocation']);
  }

  loadConfig(): void {
    this.configService.getConfig().subscribe({
      next: (data: any[]) => {
        if (data?.length > 0) {
          const c = data[0];
          this.configForm = {
            config_id: c.config_id,
            res_name: c.res_name ?? '',
            res_phone: c.res_phone ?? '',
            price_Adult: c.price_Adult ?? 0,
            price_Child: c.price_Child ?? 0,
            fine: c.fine ?? 0,
          };
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'โหลดข้อมูลร้านไม่สำเร็จ',
        });
      },
    });
  }

  loadImages(): void {
    this.imageService.getImages().subscribe({
      next: (images: ResImage[]) => {
        this.currentBanners = images.filter((img) => img.image_Type === 'Banner');
        this.currentPoster = images.find((img) => img.image_Type === 'Poster') ?? null;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'ไม่สามารถโหลดรูปภาพได้',
        });
      },
    });
  }

  onBannerUpload(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.newBanners.push({ url: reader.result, file });
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  onPosterUpload(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => (this.newPoster = { url: reader.result, file });
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  removeNewBanner(index: number): void {
    this.newBanners.splice(index, 1);
  }

  deleteExistingBanner(image: ResImage): void {
    this.confirmationService.confirm({
      message: 'ต้องการลบ Banner นี้ออกจากระบบใช่ไหม?',
      header: 'ยืนยันการลบ',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'ลบเลย',
      rejectLabel: 'ยกเลิก',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.imageService.deleteImage(image.image_id).subscribe({
          next: () => {
            this.currentBanners = this.currentBanners.filter((b) => b.image_id !== image.image_id);
            this.messageService.add({
              severity: 'info',
              summary: 'ลบแล้ว',
              detail: 'ลบ Banner เรียบร้อย',
            });
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'ผิดพลาด',
              detail: 'ลบไม่สำเร็จ',
            });
          },
        });
      },
    });
  }

  cancelNewPoster(): void {
    this.newPoster = null;
  }

  saveAllSettings(): void {
    this.isLoading = true;
    const tasks: Promise<void>[] = [];

    const configPayload = {
      Config_id: this.configForm.config_id,
      Res_name: this.configForm.res_name,
      Res_phone: this.configForm.res_phone,
      Price_Adult: this.configForm.price_Adult,
      Price_Child: this.configForm.price_Child,
      Fine: this.configForm.fine,
    };
    tasks.push(
      new Promise((resolve, reject) => {
        this.configService
          .updateConfig(configPayload)
          .subscribe({ next: () => resolve(), error: reject });
      }),
    );

    for (const banner of this.newBanners) {
      if (banner.file) {
        const fd = new FormData();
        fd.append('ImageFile', banner.file);
        fd.append('Image_Type', 'Banner');
        tasks.push(
          new Promise((resolve, reject) => {
            this.imageService.uploadImage(fd).subscribe({ next: () => resolve(), error: reject });
          }),
        );
      }
    }

    if (this.newPoster?.file) {
      const fd = new FormData();
      fd.append('ImageFile', this.newPoster.file);
      fd.append('Image_Type', 'Poster');
      if (this.currentPoster) {
        tasks.push(
          new Promise((resolve, reject) => {
            this.imageService
              .updateImage(this.currentPoster!.image_id, fd)
              .subscribe({ next: () => resolve(), error: reject });
          }),
        );
      } else {
        tasks.push(
          new Promise((resolve, reject) => {
            this.imageService.uploadImage(fd).subscribe({ next: () => resolve(), error: reject });
          }),
        );
      }
    }

    Promise.all(tasks)
      .then(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'สำเร็จ',
          detail: 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
        });
        this.newBanners = [];
        this.newPoster = null;
        this.loadImages();
      })
      .catch((err) => {
        console.error('Error:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'บันทึกไม่สำเร็จ กรุณาลองใหม่',
        });
      })
      .finally(() => (this.isLoading = false));
  }
}

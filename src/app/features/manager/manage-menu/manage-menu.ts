import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Menu, MenuService } from '../../../service/api/menu.service';
import { lastValueFrom } from 'rxjs';
import { MenuManager } from '../../../components/menu-bar/menu-manager/menu-manager';

@Component({
  selector: 'app-manage-menu',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    ToastModule,
    ConfirmDialogModule,
    MenuManager,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './manage-menu.html',
  styleUrl: './manage-menu.scss',
})
export class ManageMenu implements OnInit {
  menus: Menu[] = [];
  menuDialog: boolean = false;

  menu: Menu = this.getEmptyMenu();
  isEditMode: boolean = false;

  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;

  readonly OTHER_VALUE = '__other__';

  categoryOptions: string[] = [];
  typeOptions: string[] = [];

  selectedCategory: string = '';
  customCategory: string = '';
  selectedType: string = '';
  customType: string = '';

  get categorySelectItems(): { label: string; value: string }[] {
    return [
      ...this.categoryOptions.map((c) => ({ label: c, value: c })),
      { label: 'อื่นๆ (ระบุเอง)', value: this.OTHER_VALUE },
    ];
  }

  get typeSelectItems(): { label: string; value: string }[] {
    return [
      ...this.typeOptions.map((t) => ({ label: t, value: t })),
      { label: 'อื่นๆ (ระบุเอง)', value: this.OTHER_VALUE },
    ];
  }

  get currentTypeValue(): string {
    if (this.selectedType === this.OTHER_VALUE) {
      return this.customType ? this.customType.trim() : '';
    }
    return this.selectedType ? this.selectedType.trim() : '';
  }

  // ตรวจหาคำว่า บุฟเฟต์ / บุฟเฟ่ต์ / buffet ทุกรูปแบบ
  // ต้องกันคำปฏิเสธก่อน เพราะ "ไม่อยู่ในบุฟเฟ่ต์" ก็มีคำว่า "บุฟเฟ่ต์"
  // เป็น substring อยู่ด้วย ถ้าเช็คด้วย .includes() เฉยๆ จะเข้าใจผิดว่าเป็นบุฟเฟต์
  get isBuffetType(): boolean {
    const type = this.currentTypeValue;
    if (!type) return false;
    if (type.startsWith('ไม่')) return false;

    const t = type.toLowerCase();
    return t.includes('บุฟเฟต์') || t.includes('บุฟเฟ่ต์') || t.includes('buffet');
  }

  // ซ่อนช่องราคาเมื่อเป็นประเภทบุฟเฟต์
  get showPriceField(): boolean {
    const type = this.currentTypeValue;
    if (!type) return false;
    return !this.isBuffetType;
  }

  constructor(
    private menuService: MenuService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  ngOnInit() {
    this.loadMenus();
  }

  loadMenus() {
    this.menuService.getMenus().subscribe({
      next: (data) => {
        this.menus = data;
        this.deriveOptionsFromMenus(data);
      },
      error: (err) => console.error('Error loading menus', err),
    });
  }

  private deriveOptionsFromMenus(menus: Menu[]): void {
    const dbCategories = menus.map((m) => m.category).filter((c): c is string => !!c?.trim());
    const dbTypes = menus.map((m) => m.menu_Type).filter((t): t is string => !!t?.trim());

    this.categoryOptions = this.uniqueSorted(dbCategories);
    this.typeOptions = this.uniqueSorted(dbTypes);
  }

  private uniqueSorted(values: string[]): string[] {
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'th'));
  }

  openNew() {
    this.menu = this.getEmptyMenu();
    this.isEditMode = false;
    this.menuDialog = true;
    this.selectedFile = null;
    this.imagePreview = null;
    this.selectedCategory = '';
    this.customCategory = '';
    this.selectedType = '';
    this.customType = '';
  }

  editMenu(menu: Menu) {
    this.menu = { ...menu };
    this.isEditMode = true;
    this.menuDialog = true;
    this.selectedFile = null;

    const cat = this.mapValueToOption(this.menu.category, this.categoryOptions);
    this.selectedCategory = cat.selected;
    this.customCategory = cat.custom;

    const type = this.mapValueToOption(this.menu.menu_Type, this.typeOptions);
    this.selectedType = type.selected;
    this.customType = type.custom;

    if (this.menu.menu_Image) {
      const imgPath = String(this.menu.menu_Image);
      if (
        imgPath.startsWith('http') ||
        imgPath.startsWith('https') ||
        imgPath.startsWith('data:image')
      ) {
        this.imagePreview = imgPath;
      } else {
        this.imagePreview = 'assets/Images/product/' + imgPath;
      }
    } else {
      this.imagePreview = null;
    }
  }

  private mapValueToOption(
    value: string | null | undefined,
    options: string[],
  ): { selected: string; custom: string } {
    if (value && options.includes(value)) {
      return { selected: value, custom: '' };
    }
    if (value) {
      return { selected: this.OTHER_VALUE, custom: value };
    }
    return { selected: '', custom: '' };
  }

  onTypeChange(): void {
    if (this.isBuffetType) {
      this.menu.price = 0;
    }
  }

  onPriceInput(event: { value: number | null }): void {
    if (event.value !== null && event.value < 1) {
      this.menu.price = 1;
    }
  }

  hideDialog() {
    this.menuDialog = false;
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.menu.menu_Image = file.name;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  clearImage() {
    this.selectedFile = null;
    this.imagePreview = null;
    this.menu.menu_Image = '';
  }

  async saveMenu() {
    if (!this.menu.menu_Name?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'แจ้งเตือน',
        detail: 'กรุณากรอกชื่อเมนูอาหาร',
      });
      return;
    }

    if (this.selectedCategory === this.OTHER_VALUE && !this.customCategory?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'แจ้งเตือน',
        detail: 'กรุณาระบุชื่อหมวดหมู่ที่เลือก "อื่นๆ"',
      });
      return;
    }

    if (this.selectedType === this.OTHER_VALUE && !this.customType?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'แจ้งเตือน',
        detail: 'กรุณาระบุประเภทที่เลือก "อื่นๆ"',
      });
      return;
    }

    if (this.isBuffetType || !this.currentTypeValue) {
      this.menu.price = 0;
    } else {
      if (!this.menu.price || this.menu.price < 1) {
        this.messageService.add({
          severity: 'warn',
          summary: 'แจ้งเตือน',
          detail: 'ราคาอาหารต้องตั้งแต๋ 1 บาทขึ้นไป',
        });
        return;
      }
    }

    const finalCategory =
      this.selectedCategory === this.OTHER_VALUE
        ? this.customCategory.trim()
        : this.selectedCategory;
    const finalType =
      this.selectedType === this.OTHER_VALUE ? this.customType.trim() : this.selectedType;

    const formData = new FormData();
    formData.append('Menu_Name', this.menu.menu_Name);
    formData.append('Category', finalCategory || '');
    formData.append('Menu_Type', finalType || '');
    formData.append('Price', this.menu.price ? this.menu.price.toString() : '0');

    if (this.selectedFile) {
      formData.append('ImageFile', this.selectedFile, this.selectedFile.name);
    }

    try {
      if (this.isEditMode && this.menu.menu_id) {
        await lastValueFrom(this.menuService.updateMenu(this.menu.menu_id, formData));
        this.messageService.add({
          severity: 'success',
          summary: 'สำเร็จ',
          detail: 'อัปเดตข้อมูลเมนูเรียบร้อยแล้ว',
        });
      } else {
        await lastValueFrom(this.menuService.createMenu(formData));
        this.messageService.add({
          severity: 'success',
          summary: 'สำเร็จ',
          detail: 'เพิ่มเมนูใหม่เรียบร้อยแล้ว',
        });
      }
      this.loadMenus();
      this.menuDialog = false;
    } catch (error: any) {
      console.error('API Error:', error);
      const errorMessage = error.error?.message || 'ไม่สามารถบันทึกเมนูได้ กรุณาลองใหม่';
      this.messageService.add({
        severity: 'error',
        summary: 'ข้อผิดพลาด',
        detail: errorMessage,
      });
    }
  }

  getEmptyMenu(): Menu {
    return {
      menu_id: 0,
      menu_Name: '',
      price: 0,
      category: '',
      menu_Image: '',
      menu_Type: '',
    } as Menu;
  }
}

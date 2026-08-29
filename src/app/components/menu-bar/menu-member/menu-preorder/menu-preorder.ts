import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu-preorder',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-preorder.html',
  styleUrl: './menu-preorder.scss',
})
export class MenuPreorder {
  @Input() isSidebarOpen = false;
  @Input() bookingId: number | null = null;
  @Input() cartBadgeCount = 0;
  @Input() activeView: 'menu' | 'status' = 'menu';

  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() closeSidebar = new EventEmitter<void>();
  @Output() toggleCartModal = new EventEmitter<void>();
  @Output() goToOrderStatus = new EventEmitter<void>();
  @Output() goToBookingStatus = new EventEmitter<void>();
  @Output() goToMenu = new EventEmitter<void>();

  onCartClick() {
    this.toggleCartModal.emit();
    this.closeSidebar.emit();
  }

  onOrderStatusClick() {
    this.goToOrderStatus.emit();
    this.closeSidebar.emit();
  }

  onMenuClick() {
    this.goToMenu.emit();
    this.closeSidebar.emit();
  }
}

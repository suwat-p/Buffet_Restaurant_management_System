import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MenuMember } from '../../../components/menu-bar/menu-member/menu-member';

@Component({
  selector: 'app-menu-preorder',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MenuMember],
  templateUrl: './menu-preorder.html',
  styleUrl: './menu-preorder.scss',
})
export class MenuPreorder implements OnInit {
  bookingId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['bookingId']) {
        this.bookingId = Number(params['bookingId']);
      }
    });
  }

  goToPreOrderCart() {
    this.router.navigate(['/pre-order-cart'], {
      queryParams: { bookingId: this.bookingId },
    });
  }

  goToBookingStatus() {
    if (this.bookingId) {
      this.router.navigate(['/BookingStatus'], {
        queryParams: { bookingId: this.bookingId },
      });
    } else {
      this.router.navigate(['/BookingStatus']);
    }
  }
}

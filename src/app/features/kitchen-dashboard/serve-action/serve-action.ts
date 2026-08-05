import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { OrderService } from '../../../service/api/order.service';

type ServeState = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'invalid';

@Component({
  selector: 'app-serve-action',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './serve-action.html',
  styleUrl: './serve-action.scss',
})
export class ServeAction implements OnInit {
  orderId: number | null = null;
  state: ServeState = 'loading';
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.queryParamMap.get('orderId');
    const id = idParam ? Number(idParam) : NaN;

    if (!idParam || Number.isNaN(id)) {
      this.state = 'invalid';
      return;
    }

    this.orderId = id;
    this.state = 'ready';
  }

  confirmServe() {
    if (!this.orderId || this.state === 'submitting') return;

    this.state = 'submitting';
    this.orderService.ServeOrder(this.orderId).subscribe({
      next: () => {
        this.state = 'success';
      },
      error: (err) => {
        this.state = 'error';
        this.errorMessage =
          err?.error?.message ||
          'ไม่สามารถเปลี่ยนสถานะได้ อาจมีคนกดยืนยันไปแล้ว หรือออเดอร์ยังไม่พร้อม';
      },
    });
  }
}

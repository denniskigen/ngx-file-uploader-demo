import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  public dataModel = '';

  public upload(file: any) {
    this.dataModel = 'https://unsplash.it/200/300';
  }

  public clear() {
    this.dataModel = '';
  }
}

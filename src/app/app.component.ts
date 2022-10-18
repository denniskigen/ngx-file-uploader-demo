import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  dataModel = '';

  upload(file: FileList) {
    this.dataModel = 'https://unsplash.it/200/300';
  }

  clear() {
    this.dataModel = '';
  }
}

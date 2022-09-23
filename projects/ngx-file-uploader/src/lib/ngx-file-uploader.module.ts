import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebcamModule } from 'ngx-webcam';
import { NgxFileUploaderComponent } from './ngx-file-uploader.component';

@NgModule({
  declarations: [NgxFileUploaderComponent],
  imports: [CommonModule, FormsModule, WebcamModule],
  exports: [NgxFileUploaderComponent],
})
export class NgxFileUploaderModule {}

import {
  Component,
  EventEmitter,
  forwardRef,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { jsPDF } from 'jspdf';
import { WebcamImage, WebcamInitError, WebcamUtil } from 'ngx-webcam';
import { noop, Observable, Subject } from 'rxjs';

export interface FileList {
  data: FileReader['result'];
  id?: number;
  name?: string;
  size?: number;
}

@Component({
  selector: 'lib-ngx-file-uploader',
  styleUrls: ['./ngx-file-uploader.component.scss'],
  templateUrl: './ngx-file-uploader.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NgxFileUploaderComponent),
      multi: true,
    },
  ],
})
export class NgxFileUploaderComponent implements ControlValueAccessor, OnInit {
  @Input() canUploadMultipleFiles = false;
  @Input() isFormEntryMode = true;
  @Input() srcUrl = '';
  @Output() fileChanged: EventEmitter<any> = new EventEmitter();
  @Output() inputCleared: EventEmitter<any> = new EventEmitter();
  @Output() uploadData: EventEmitter<any> = new EventEmitter();

  canSwitchCameras = true;
  deviceId: string = '';
  errors: WebcamInitError[] = [];
  fileList = new Array<WebcamImage | FileList>();
  fileType = '';
  hasBothImagesAndPdfs = true;
  hasFilesToUpload = false;
  hasMultipleFiles = true;
  hasMultipleWebcams = false;
  hasPdf = false;
  isBackButtonEnabled = false;
  isLiveCamera = false;
  isMergeButtonEnabled = false;
  isMobile = false;
  isPdfCreated = false;
  isReadyToUploadFiles = false;
  isSelectingFileType = true;
  isShowingWebcam = true;
  isUploading = false;
  message = '';
  messageType = '';
  urls = new Array<any>();
  videoOptions: MediaTrackConstraints = {};
  webcamImage = null;

  // webcam snapshot trigger
  private trigger: Subject<void> = new Subject<void>();
  // switch to next / previous / specific webcam; true/false: forward/backwards, string: deviceId
  private nextWebcam: Subject<boolean | string> = new Subject<
    boolean | string
  >();
  // The internal data model
  private innerValue: any = '';
  // Placeholders for the callbacks which are later provided
  // by the Control Value Accessor
  private onTouchedCallback: () => void = noop;
  private onChangeCallback: (_: any) => void = noop;

  ngOnInit() {
    if (!this.canUploadMultipleFiles) {
      this.hasMultipleFiles = false;
      this.hasBothImagesAndPdfs = false;
    }

    if (window.screen.width <= 692) {
      // 768px portrait
      this.isMobile = true;
    }

    WebcamUtil.getAvailableVideoInputs().then(
      (mediaDevices: MediaDeviceInfo[]) => {
        this.hasMultipleWebcams = mediaDevices && mediaDevices.length > 1;
      }
    );
  }

  // get accessor
  get value(): any {
    return this.innerValue;
  }

  // set accessor including call the onchange callback
  set value(v: any) {
    if (v !== this.innerValue) {
      this.innerValue = v;
      this.onChangeCallback(v);
    }
  }

  // Current time string
  writeValue(value: any) {
    if (value !== this.innerValue) {
      this.innerValue = value;
    }
  }

  // From ControlValueAccessor interface
  registerOnChange(fn: any) {
    this.onChangeCallback = fn;
  }

  // From ControlValueAccessor interface
  registerOnTouched(fn: any) {
    this.onTouchedCallback = fn;
  }

  onBlur() {
    this.onTouchedCallback();
  }

  onChange(event: any) {
    const files = event.srcElement.files;
    this.isUploading = true;
    // const fileToLoad = files;

    if (this.fileType === 'liveCamera') {
      this.isReadyToUploadFiles = true;
    }

    if (files) {
      for (const file of files) {
        const fileReader = new FileReader();
        if (this.fileType === 'pdf' && this.isFormEntryMode) {
          this.urls = [];
          this.fileList = [];
        }
        fileReader.onload = (fileLoadedEvent: any) => {
          const data = fileReader.result;
          const name = file.name;
          const fileSize = Math.round(file.size / 1024);
          if (fileSize >= 3072) {
            this.message = 'File size exceeds limit';
            this.messageType = 'danger';
            this.messageViewTimeout();
            this.back();
          } else {
            const payload = {
              data,
              id: this.urls.length + 1,
              name: name,
              size: fileSize,
            };
            if (this.canUploadMultipleFiles) {
              this.urls.push(payload);
              this.fileList.push(payload);
            } else {
              this.fileChanged.emit(payload);
              this.back();
            }
          }
        };
        fileReader.readAsDataURL(file);
      }
    }
  }

  messageViewTimeout() {
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }

  clear() {
    this.value = '';
    this.onChangeCallback(this.value);
    this.urls = [];
    this.back();
    this.inputCleared.emit();
  }

  back() {
    this.isSelectingFileType = true;
    this.urls = [];
    this.isBackButtonEnabled = false;
    this.fileList = [];
    this.isReadyToUploadFiles = false;
    this.canUploadMultipleFiles = true;
    this.hasPdf = false;
    this.isMergeButtonEnabled = false;
    this.hasFilesToUpload = false;
    this.isLiveCamera = false;
  }

  toggleVisibility(filetype: string) {
    this.fileType = filetype;
    console.log('filetype: ', filetype);
    if (filetype === 'image') {
      if (this.isFormEntryMode) {
        this.message =
          'Images will be merged into one pdf when uploaded in formentry';
        this.messageType = 'danger';
        this.messageViewTimeout();
      }
      this.fileType = 'image/png, image/jpeg, image/gif';
      this.hasFilesToUpload = true;
    } else if (filetype === 'pdf') {
      if (this.isFormEntryMode) {
        this.hasMultipleFiles = false;
      }
      this.fileType = 'application/pdf';
      this.hasPdf = true;
      this.hasFilesToUpload = true;
    } else if (filetype === 'both') {
      this.fileType = 'image/png, image/jpeg, image/gif, application/pdf';
      this.hasPdf = true;
      this.hasFilesToUpload = true;
    } else if (filetype === 'liveCamera') {
      this.isLiveCamera = true;
    }
    this.isSelectingFileType = false;
    this.isBackButtonEnabled = true;
    if (this.value) {
      this.clear();
    }
  }

  upload() {
    if (!this.isPdfCreated) {
      if (this.isFormEntryMode && !this.hasPdf) {
        this.mergeImages();
      }
    }
    this.uploadData.emit(this.fileList);
    this.back();
  }

  mergeImages() {
    const doc = new jsPDF({ compress: true });

    this.fileList.forEach((file) => {
      const imageData =
        (file as FileList).data?.toString() ||
        (file as WebcamImage).imageAsDataUrl;

      doc.addImage(imageData, 'JPG', 10, 10, 190, 270, undefined, 'FAST');
      doc.setFontSize(10);
      doc.text('Page ' + doc.getCurrentPageInfo().pageNumber, 180, 290);
      doc.addPage();
    });

    doc.setProperties({
      title: 'AMPATH Point of Care Medical Data',
      author: 'POC',
      creator: 'AMPATH',
    });
    doc.deletePage(this.fileList.length + 1);
    this.fileList = [];
    this.urls = [];
    const output = doc.output('datauristring');
    doc.save('Ampath Data');
    const re = /filename=generated.pdf;/gi;
    const data = output.replace(re, '');
    const payload = {
      data,
    };

    if (this.isFormEntryMode) {
      this.fileList = [];
      this.urls = [];
    }

    this.message =
      'The images have been merged into a PDF file. Continue to upload.';
    this.messageType = 'success';
    this.messageViewTimeout();
    this.fileList.push(payload);
    this.urls.push(payload);
    this.canUploadMultipleFiles = true;
    this.isReadyToUploadFiles = true;
    this.isPdfCreated = true;
  }

  delete(urls: any) {
    for (let i = 0; i <= this.urls.length; i++) {
      if (urls.data) {
        if (this.urls[i].data === urls.data) {
          this.urls.splice(i, 1);
          this.fileList.splice(i, 1);
          break;
        }
      } else if (urls.imageAsDataUrl) {
        if (this.urls[i].imageAsDataUrl === urls.imageAsDataUrl) {
          this.urls.splice(i);
          this.fileList.splice(i, 1);
          break;
        }
      }
    }
    // enabling merge button if remaining on urls is images
    const re = /pdf/gi;

    for (let index = 0; index < this.urls.length; index++) {
      if (this.urls[index].data.search(re) === -1) {
        this.hasPdf = true;
        break;
      } else {
        this.isMergeButtonEnabled = true;
        this.hasPdf = false;
        this.hasFilesToUpload = true;
      }
    }
  }

  triggerSnapshot() {
    this.isReadyToUploadFiles = true;
    this.trigger.next();
  }

  toggleWebcam() {
    this.isShowingWebcam = !this.isShowingWebcam;
  }

  handleInitError(error: WebcamInitError) {
    this.errors.push(error);
  }

  showNextWebcam(directionOrDeviceId: boolean | string) {
    // true => move forward through devices
    // false => move backwards through devices
    // string => move to device with given deviceId
    this.nextWebcam.next(directionOrDeviceId);
  }

  handleImage(webcamImage: WebcamImage) {
    if (!this.canUploadMultipleFiles) {
      this.urls = [];
      this.fileList = [];
      this.pushData(webcamImage);
    }
    this.pushData(webcamImage);
  }

  pushData(webcamImage: WebcamImage) {
    this.urls.push(webcamImage);
    this.fileList.push(webcamImage);
  }

  cameraWasSwitched(deviceId: string) {
    this.deviceId = deviceId;
  }

  get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  get nextWebcamObservable(): Observable<boolean | string> {
    return this.nextWebcam.asObservable();
  }

  getUrl() {
    const file = this.srcUrl;
    window.open(file, '_blank');
  }
}

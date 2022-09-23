import {
  Component,
  EventEmitter,
  forwardRef,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { WebcamInitError, WebcamImage, WebcamUtil } from 'ngx-webcam';
import { Subject, noop, Observable } from 'rxjs';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'lib-ngx-file-uploader',
  styleUrls: ['./ngx-file-uploader.component.scss'],
  templateUrl: './ngx-file-uploader.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      // tslint:disable-next-line:no-forward-ref
      useExisting: forwardRef(() => NgxFileUploaderComponent),
      multi: true,
    },
  ],
})
export class NgxFileUploaderComponent implements ControlValueAccessor, OnInit {
  public urls = new Array<any>();
  public selectFileType = true;
  public fileList = new Array<any>();
  public fileType = '';
  public message = '';
  public pdfCreated = false;
  public messageType = '';
  public liveCamera = false;
  public pdfAvailable = false;
  public mobile = false;
  public UploadCaptions = false;
  @Input() public singleFile: any;
  @Input() public formEntry: any;
  @Input() public srcUrl: any;
  public multiple = true;
  public fileUpload = false;
  public fieType = '';
  public both = true;
  public merge = false;
  public backButton = false;
  @Input() public source: any;
  @Output() public fileChanged: EventEmitter<any> = new EventEmitter();
  @Output() public uploadData: EventEmitter<any> = new EventEmitter();
  @Output() public _onClear: EventEmitter<any> = new EventEmitter();
  public _imagePath = '';
  public showWebcam = true;
  public allowCameraSwitch = true;
  public multipleWebcamsAvailable = false;
  public deviceId = '';
  public videoOptions: MediaTrackConstraints = {
    // width: {ideal: 1024},
    // height: {ideal: 576}
  };
  public errors: WebcamInitError[] = [];

  // latest snapshot
  public webcamImage = null;

  // webcam snapshot trigger
  private trigger: Subject<void> = new Subject<void>();
  // switch to next / previous / specific webcam; true/false: forward/backwards, string: deviceId
  private nextWebcam: Subject<boolean | string> = new Subject<
    boolean | string
  >();
  public uploading = false;
  // The internal data model
  private innerValue: any = '';

  // Placeholders for the callbacks which are later providesd
  // by the Control Value Accessor
  private onTouchedCallback: () => void = noop;
  private onChangeCallback: (_: any) => void = noop;

  public ngOnInit() {
    if (this.singleFile) {
      this.multiple = false;
      this.both = false;
    }
    if (window.screen.width <= 692) {
      // 768px portrait
      this.mobile = true;
    }
    WebcamUtil.getAvailableVideoInputs().then(
      (mediaDevices: MediaDeviceInfo[]) => {
        this.multipleWebcamsAvailable = mediaDevices && mediaDevices.length > 1;
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
  // Current time string.

  public writeValue(value: any) {
    if (value !== this.innerValue) {
      this.innerValue = value;
    }
  }

  // From ControlValueAccessor interface
  public registerOnChange(fn: any) {
    this.onChangeCallback = fn;
  }

  // From ControlValueAccessor interface
  public registerOnTouched(fn: any) {
    this.onTouchedCallback = fn;
  }

  public onBlur() {
    this.onTouchedCallback();
  }

  public onChange(event: any) {
    const files = event.srcElement.files;
    this.uploading = true;
    // const fileToLoad = files;
    if (this.fieType === 'liveCamera') {
      this.UploadCaptions = true;
    }
    if (files) {
      for (const file of files) {
        const fileReader = new FileReader();
        if (this.fileType === 'pdf' && this.formEntry) {
          this.urls = [];
          this.fileList = [];
        }
        fileReader.onload = (fileLoadedEvent: any) => {
          const data = fileReader.result;
          const name = file.name;
          const fileSize = Math.round(file.size / 1024);
          if (fileSize >= 3072) {
            this.message = 'File Too large';
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
            if (!this.singleFile) {
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
  public messageViewTimeout() {
    setTimeout(() => {
      this.message = '';
    }, 12000);
  }
  public clear() {
    this.value = '';
    this.onChangeCallback(this.value);
    this.urls = [];
    this.back();
    this._onClear.emit();
  }
  public back() {
    this.selectFileType = true;
    this.urls = [];
    this.backButton = false;
    this.fileList = [];
    this.UploadCaptions = false;
    this.singleFile = false;
    this.pdfAvailable = false;
    this.merge = false;
    this.fileUpload = false;
    this.liveCamera = false;
  }
  public toggleVisibility(filetype: string) {
    this.fieType = filetype;
    if (filetype === 'image') {
      if (this.formEntry) {
        this.message =
          ' Images will be merged into one pdf when uploaded in formentry';
        this.messageType = 'danger';
        this.messageViewTimeout();
      }
      this.fileType = 'image/png, image/jpeg, image/gif';
      this.fileUpload = true;
    } else if (filetype === 'pdf') {
      if (this.formEntry) {
        this.multiple = false;
      }
      this.fileType = 'application/pdf';
      this.pdfAvailable = true;
      this.fileUpload = true;
    } else if (filetype === 'both') {
      this.fileType = 'image/png, image/jpeg, image/gif , application/pdf';
      this.pdfAvailable = true;
      this.fileUpload = true;
    } else if (filetype === 'liveCamera') {
      this.liveCamera = true;
    }
    this.selectFileType = false;
    this.backButton = true;
    if (this.value) {
      this.clear();
    }
  }

  public upload() {
    if (!this.pdfCreated) {
      if (this.formEntry && this.pdfAvailable === false) {
        this.mergeImages();
      }
    }
    this.uploadData.emit(this.fileList);
    this.back();
  }

  public mergeImages() {
    const doc = new jsPDF({ compress: true });
    // doc.page = 1;
    for (let i = 0; i < this.fileList.length; i++) {
      const imageData =
        this.fileList[i].data || this.fileList[i].imageAsDataUrl;
      doc.addImage(imageData, 'JPG', 10, 10, 190, 270, undefined, 'FAST');
      doc.setFont('courier', 'normal', 400);
      doc.text('page ', 180, 290);
      // doc.page++;
      if (i < this.fileList.length) {
        doc.addPage();
      }
    }
    doc.setProperties({
      title: 'Ampath Medical Data',
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
    if (this.formEntry) {
      this.fileList = [];
      this.urls = [];
    }
    this.message =
      'The images have been merged into one pdf, You can now upload';
    this.messageType = 'success';
    this.messageViewTimeout();
    this.fileList.push(payload);
    this.urls.push(payload);
    this.singleFile = false;
    this.UploadCaptions = true;
    this.pdfCreated = true;
  }
  public delete(urls: any) {
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
        this.pdfAvailable = true;
        break;
      } else {
        this.merge = true;
        this.pdfAvailable = false;
        this.fileUpload = true;
      }
    }
  }
  public triggerSnapshot(): void {
    this.UploadCaptions = true;
    this.trigger.next();
  }

  public toggleWebcam(): void {
    this.showWebcam = !this.showWebcam;
  }

  public handleInitError(error: WebcamInitError): void {
    this.errors.push(error);
  }

  public showNextWebcam(directionOrDeviceId: boolean | string): void {
    // true => move forward through devices
    // false => move backwards through devices
    // string => move to device with given deviceId
    this.nextWebcam.next(directionOrDeviceId);
  }

  public handleImage(webcamImage: WebcamImage): void {
    if (this.singleFile) {
      this.urls = [];
      this.fileList = [];
      this.pushData(webcamImage);
    }
    this.pushData(webcamImage);
  }
  // @ts-ignore
  public pushData(webcamImage) {
    this.urls.push(webcamImage);
    this.fileList.push(webcamImage);
  }

  public cameraWasSwitched(deviceId: string): void {
    this.deviceId = deviceId;
  }

  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  public get nextWebcamObservable(): Observable<boolean | string> {
    return this.nextWebcam.asObservable();
  }
  public getUrl() {
    const file = this.srcUrl;
    window.open(file, '_blank');
  }
}

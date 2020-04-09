import { Component, ElementRef, Input, Output, OnDestroy, EventEmitter, forwardRef, Renderer2, ViewChild, ChangeDetectorRef } from '@angular/core';
import { trigger, state, style, transition, animate, AnimationEvent } from '@angular/animations';
import { DomHandler } from 'primeng/dom';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

export const COLORPICKER_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => ColorPicker),
  multi: true
};

@Component({
    selector: 'app-colorpicker',
    templateUrl: './colorpicker.html',
    styleUrls: ['./colorpicker.css'],
    animations: [
        trigger('overlayAnimation', [
            state('void', style({
                transform: 'translateY(5%)',
                opacity: 0
            })),
            state('visible', style({
                transform: 'translateY(0)',
                opacity: 1
            })),
            transition('void => visible', animate('{{showTransitionParams}}')),
            transition('visible => void', animate('{{hideTransitionParams}}'))
        ])
    ],
    providers: [COLORPICKER_VALUE_ACCESSOR]
})
export class ColorPicker implements ControlValueAccessor, OnDestroy {

    @Input() style: any;

    @Input() styleClass: string;
    
    @Input() inline: boolean;
    
    @Input() format: string = 'hex';

    @Input() appendTo: string;
    
    @Input() disabled: boolean;
    
    @Input() tabindex: string;
    
    @Input() inputId: string;

    @Input() autoZIndex: boolean = true;
    
    @Input() baseZIndex: number = 0;

    @Input() showTransitionOptions: string = '225ms ease-out';

    @Input() hideTransitionOptions: string = '195ms ease-in';
    
    @Output() onChange: EventEmitter<any> = new EventEmitter();
    
    @ViewChild('input', { static: false }) inputViewChild: ElementRef;
    
    @Input() mode: 'rgb' | 'hsb' = 'rgb';
    
    value: HSB;

    editValue:HSB;

    get rgb_r(){ return this.HSBtoRGB(this.editValue).r; }
    set rgb_r(r:number){ let rgb=this.HSBtoRGB(this.editValue); rgb.r=r; this.editValue=this.RGBtoHSB(rgb); this.refresh(); }

    get rgb_g(){ return this.HSBtoRGB(this.editValue).g; }
    set rgb_g(g:number){ let rgb=this.HSBtoRGB(this.editValue); rgb.g=g; this.editValue=this.RGBtoHSB(rgb); this.refresh(); }

    get rgb_b(){ return this.HSBtoRGB(this.editValue).b; }
    set rgb_b(b:number){ let rgb=this.HSBtoRGB(this.editValue); rgb.b=b; this.editValue=this.RGBtoHSB(rgb); this.refresh(); }
    
    get hsb_h(){ return this.editValue.h; }
    set hsb_h(h:number){ this.editValue.h = h; this.refresh(); }

    get hsb_s(){ return this.editValue.s; }
    set hsb_s(s:number){ this.editValue.s = s; this.refresh(); }

    get hsb_b(){ return this.editValue.b; }
    set hsb_b(b:number){ this.editValue.b = b; this.refresh(); }

    get hexValue(){return this.HSBtoHEX(this.editValue);}

    get inputBgColor(){return this.HSBtoHEX(this.value);} 
    
    shown: boolean;
    
    overlayVisible: boolean;
    
    defaultColor: string = 'ff0000';
    
    onModelChange: Function = () => {};
    
    onModelTouched: Function = () => {};
    
    documentClickListener: Function;
    
    documentMousemoveListener: Function;
    
    documentMouseupListener: Function;
    
    documentHueMoveListener: Function;
                
    selfClick: boolean;
    
    colorDragging: boolean;
    
    hueDragging: boolean;

    overlay: HTMLDivElement;

    colorSelectorViewChild: ElementRef;
    
    colorHandleViewChild: ElementRef;
    
    hueViewChild: ElementRef;
    
    hueHandleViewChild: ElementRef;
    
    static recentColors=['#ffffff','#ffffff','#ffffff','#ffffff','#ffffff','#ffffff','#ffffff','#ffffff','#ffffff','#ffffff','#ffffff','#ffffff'];   
    recentColors:any[];
    commonColors:[][];
    constructor(public el: ElementRef, public renderer: Renderer2, public cd: ChangeDetectorRef) {
        this.recentColors = ColorPicker.recentColors;
    }
        
    @ViewChild('colorSelector', { static: false }) set colorSelector(element: ElementRef) {
        this.colorSelectorViewChild = element;
    }

    @ViewChild('colorHandle', { static: false }) set colorHandle(element: ElementRef) {
        this.colorHandleViewChild = element;
    }

    @ViewChild('hue', { static: false }) set hue(element: ElementRef) {
        this.hueViewChild = element;
    }

    @ViewChild('hueHandle', { static: false }) set hueHandle(element: ElementRef) {
        this.hueHandleViewChild = element;
    }

    onHueMousedown(event: MouseEvent) {
        if (this.disabled) {
            return;
        }
        
        this.bindDocumentMousemoveListener();
        this.bindDocumentMouseupListener();
        
        this.hueDragging = true;
        this.pickHue(event);
    }
    
    pickHue(event: MouseEvent) {
        let top: number = this.hueViewChild.nativeElement.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0);
        this.editValue = this.validateHSB({
            h: Math.floor(360 * (150 - Math.max(0, Math.min(150, (event.pageY - top)))) / 150),
            s: this.editValue.s,
            b: this.editValue.b
        });
        
        this.refresh();
    }
    
    onColorMousedown(event: MouseEvent) {
        if (this.disabled) {
            return;
        }
        
        this.bindDocumentMousemoveListener();
        this.bindDocumentMouseupListener();
        
        this.colorDragging = true;
        this.pickColor(event);
    }
    
    pickColor(event: MouseEvent) {
        let rect = this.colorSelectorViewChild.nativeElement.getBoundingClientRect();
        let top = rect.top + (window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0);
        let left = rect.left + document.body.scrollLeft;
        let saturation = Math.floor(100 * (Math.max(0, Math.min(150, (event.pageX - left)))) / 150);
        let brightness = Math.floor(100 * (150 - Math.max(0, Math.min(150, (event.pageY - top)))) / 150);
        this.editValue = this.validateHSB({
            h: this.editValue.h,
            s: saturation,
            b: brightness
        });
        
        this.updateUI();
    }

    writeValue(value: any): void {
        let v;
        if (value) {
            switch(this.format) {
                case 'hex':
                    v = this.HEXtoHSB(value);
                break;
                
                case 'rgb':
                    v = this.RGBtoHSB(value);
                break;
                
                case 'hsb':
                    v = value;
                break;
            }
        }
        else {
            v = this.HEXtoHSB(this.defaultColor);
        }
        this.value = v;
        this.editValue = {h:v.h, s:v.s, b:v.b};
        this.refresh();
    }
    
    updateColorSelector() {
        if (this.colorSelectorViewChild) {
            const hsb: any = {};
            hsb.s = 100;
            hsb.b = 100;
            hsb.h = this.editValue.h;

            this.colorSelectorViewChild.nativeElement.style.backgroundColor = this.HSBtoHEX(hsb);
        }
    }
        
    updateUI() {
        if (this.colorHandleViewChild && this.hueHandleViewChild.nativeElement) {
            this.colorHandleViewChild.nativeElement.style.left =  Math.floor(150 * this.editValue.s / 100) + 'px';
            this.colorHandleViewChild.nativeElement.style.top =  Math.floor(150 * (100 - this.editValue.b) / 100) + 'px';
            this.hueHandleViewChild.nativeElement.style.top = Math.floor(150 - (150 * this.editValue.h / 360)) + 'px';

        }
    }
    
    refresh(){
        this.updateColorSelector();
        this.updateUI();
    }
    
    onInputFocus() {
        this.onModelTouched();
    }
    
    show() {
        this.overlayVisible = true;
        this.editValue = {h:this.value.h,s:this.value.s,b:this.value.b};
    }

    onOverlayAnimationStart(event: AnimationEvent) {
        switch(event.toState) {
            case 'visible':
                if (!this.inline) {
                    this.overlay = event.element;
                    this.appendOverlay();
                    if (this.autoZIndex) {
                        this.overlay.style.zIndex = String(this.baseZIndex + (++DomHandler.zindex));
                    }
                    this.alignOverlay();
                    this.bindDocumentClickListener();

                    this.refresh();
                }
            break;

            case 'void':
                this.onOverlayHide();
            break;
        }
    }

    appendOverlay() {
        if (this.appendTo) {
            if (this.appendTo === 'body')
                document.body.appendChild(this.overlay);
            else
                DomHandler.appendChild(this.overlay, this.appendTo);
        }
    }

    restoreOverlayAppend() {
        if (this.overlay && this.appendTo) {
            this.el.nativeElement.appendChild(this.overlay);
        }
    }
    
    alignOverlay() {
        if (this.appendTo)
            DomHandler.absolutePosition(this.overlay, this.inputViewChild.nativeElement);
        else
            DomHandler.relativePosition(this.overlay, this.inputViewChild.nativeElement);
    }
    
    hide() {
        this.overlayVisible = false;
    }
         
    onInputClick() {
        this.selfClick = true;
        this.togglePanel();
    }
    
    togglePanel() {
        if (!this.overlayVisible)
            this.show();
        else
            this.hide();
    }
    
    onInputKeydown(event: KeyboardEvent) {
        switch(event.which) {
            //space
            case 32:
                this.togglePanel();
                event.preventDefault();
            break;
                        
            //escape and tab
            case 27:
            case 9:
                this.hide();
            break;
        }
    }
    static readonly reg=/^([0-9a-fA-F]{6})$/;
    onHexInput(val:string){
        let hex=val;        
        if(val.startsWith('#')){
            hex = hex.substr(1, hex.length-1);
        }
        if(hex.length == 6 && ColorPicker.reg.test(hex)){
            this.editValue = this.HEXtoHSB(hex);
            this.refresh();
        }
    }

    onCellClick(rgbcolor:string){
        this.editValue = this.RGBtoHSB(this.RGBFromString(rgbcolor));
        this.refresh();
    }

    onPanelClick() {
        this.selfClick = true;
    }
    
    registerOnChange(fn: Function): void {
        this.onModelChange = fn;
    }

    registerOnTouched(fn: Function): void {
        this.onModelTouched = fn;
    }
    
    setDisabledState(val: boolean): void {
        this.disabled = val;
    }
    
    bindDocumentClickListener() {
        if (!this.documentClickListener) {
            this.documentClickListener = this.renderer.listen('document', 'click', () => {
                if (!this.selfClick) {
                    this.overlayVisible = false;
                    this.unbindDocumentClickListener();
                }
                
                this.selfClick = false;
                this.cd.markForCheck();
            });
        }    
    }
    
    unbindDocumentClickListener() {
        if (this.documentClickListener) {
            this.documentClickListener();
            this.documentClickListener = null;
        }
    }
    
    bindDocumentMousemoveListener() {
        if (!this.documentMousemoveListener) {
            this.documentMousemoveListener = this.renderer.listen('document', 'mousemove', (event: MouseEvent) => {
                if (this.colorDragging) {
                    this.pickColor(event);
                }
                
                if (this.hueDragging) {
                    this.pickHue(event);
                }
            });
        }
    }
    
    unbindDocumentMousemoveListener() {
        if (this.documentMousemoveListener) {
            this.documentMousemoveListener();
            this.documentMousemoveListener = null;
        }
    }
    
    bindDocumentMouseupListener() {
        if (!this.documentMouseupListener) {
            this.documentMouseupListener = this.renderer.listen('document', 'mouseup', () => {
                this.colorDragging = false;
                this.hueDragging = false;
                this.unbindDocumentMousemoveListener();
                this.unbindDocumentMouseupListener();
            });
        }
    }
    
    unbindDocumentMouseupListener() {
        if (this.documentMouseupListener) {
            this.documentMouseupListener();
            this.documentMouseupListener = null;
        }
    }

    validateHSB(hsb:HSB) :HSB{
        return {
            h: Math.min(360, Math.max(0, hsb.h)),
            s: Math.min(100, Math.max(0, hsb.s)),
            b: Math.min(100, Math.max(0, hsb.b))
        };
    }
    
    validateRGB(rgb:RGB):RGB {
        return {
            r: Math.min(255, Math.max(0, rgb.r)),
            g: Math.min(255, Math.max(0, rgb.g)),
            b: Math.min(255, Math.max(0, rgb.b))
        };
    }
    
    validateHEX(hex:string):string {
        var len = 6 - hex.length;
        if (len > 0) {
            var o = [];
            for (var i=0; i<len; i++) {
                o.push('0');
            }
            o.push(hex);
            hex = o.join('');
        }
        return hex;
    }
    
    HEXtoRGB(hex:string):RGB {
        let hexValue = parseInt(((hex.indexOf('#') > -1) ? hex.substring(1) : hex), 16);
        return {r: hexValue >> 16, g: (hexValue & 0x00FF00) >> 8, b: (hexValue & 0x0000FF)};
    }
    
    HEXtoHSB(hex:string):HSB {
        return this.RGBtoHSB(this.HEXtoRGB(hex));
    }
    
    RGBFromString(rgb:string):RGB{
        rgb = rgb.substr(4,rgb.length-5);
        const arr = rgb.split(',');
        return {r:parseInt(arr[0]),g:parseInt(arr[1]),b:parseInt(arr[2])};
    }

    RGBtoHSB(rgb:RGB):HSB {
        var hsb = {
            h: 0,
            s: 0,
            b: 0
        };
        var min = Math.min(rgb.r, rgb.g, rgb.b);
        var max = Math.max(rgb.r, rgb.g, rgb.b);
        var delta = max - min;
        hsb.b = max;
        hsb.s = max != 0 ? 255 * delta / max : 0;
        if (hsb.s != 0) {
            if (rgb.r == max) {
                hsb.h = (rgb.g - rgb.b) / delta;
            } else if (rgb.g == max) {
                hsb.h = 2 + (rgb.b - rgb.r) / delta;
            } else {
                hsb.h = 4 + (rgb.r - rgb.g) / delta;
            }
        } else {
            hsb.h = -1;
        }
        hsb.h *= 60;
        if (hsb.h < 0) {
            hsb.h += 360;
        }
        hsb.s *= 100/255;
        hsb.b *= 100/255;
        return hsb;
    }
    
    HSBtoRGB(hsb:HSB):RGB {
        var rgb = {
            r: null, g: null, b: null
        };
        let h: number = hsb.h;
        let s: number = hsb.s*255/100;
        let v: number = hsb.b*255/100;
        if (s == 0) {
            rgb = {
                r: v,
                g: v,
                b: v
            }
        } 
        else {
            let t1: number = v;
            let t2: number = (255-s)*v/255;
            let t3: number = (t1-t2)*(h%60)/60;
            if (h==360) h = 0;
            if (h<60) {rgb.r=t1;	rgb.b=t2; rgb.g=t2+t3}
            else if (h<120) {rgb.g=t1; rgb.b=t2;	rgb.r=t1-t3}
            else if (h<180) {rgb.g=t1; rgb.r=t2;	rgb.b=t2+t3}
            else if (h<240) {rgb.b=t1; rgb.r=t2;	rgb.g=t1-t3}
            else if (h<300) {rgb.b=t1; rgb.g=t2;	rgb.r=t2+t3}
            else if (h<360) {rgb.r=t1; rgb.g=t2;	rgb.b=t1-t3}
            else {rgb.r=0; rgb.g=0;	rgb.b=0}
        }
        return {r:Math.round(rgb.r), g:Math.round(rgb.g), b:Math.round(rgb.b)};
    }
    
    RGBtoHEX(rgb:RGB):string {
        var hex = [
            rgb.r.toString(16),
            rgb.g.toString(16),
            rgb.b.toString(16)
        ];
        
        for(var key in hex) {
            if (hex[key].length == 1) {
                hex[key] = '0' + hex[key];
            }
        }        

        return '#'+hex.join('');
    }
    
    HSBtoHEX(hsb:HSB):string {
        return this.RGBtoHEX(this.HSBtoRGB(hsb));
    }

    cancel(){
        this.hide();
    }

    updateRecentColors(){
        let hex = this.HSBtoHEX(this.editValue);
        let exist = false;
        this.recentColors.map(c=>{
            if(c==hex){
                exist=true;
            }
        })
        if(!exist){
            for(let i=11;i>0;i--){
                this.recentColors[i]=this.recentColors[i-1];
            }
            this.recentColors[0]=hex;
        }
    }

    apply(){
        let val: any;
        switch(this.format) {
            case 'hex':
                val = this.HSBtoHEX(this.editValue);
            break;
            
            case 'rgb':
                val = this.HSBtoRGB(this.editValue);
            break;
            
            case 'hsb':
                val = this.editValue;
            break;
        }
        this.value = this.editValue;
        this.onModelChange(val);
        this.onChange.emit({originalEvent: event, value: val});
        this.updateRecentColors();
        this.hide();
    }

    onOverlayHide() {
        this.unbindDocumentClickListener();
        this.overlay = null;
    }
    
    ngOnDestroy() {
        this.restoreOverlayAppend();
        this.onOverlayHide();
    }
}

interface RGB{
    r:number,
    g:number,
    b:number
}

interface HSB{
    h:number,
    s:number,
    b:number
}
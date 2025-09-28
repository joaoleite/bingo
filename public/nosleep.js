// NoSleep.js - Biblioteca para manter a tela ativa
// Versão simplificada inline
class NoSleep {
    constructor() {
        this.enabled = false;
        this.media = null;
        this.wakeLock = null;
    }

    async enable() {
        if (this.enabled) return;

        try {
            // Método 1: Screen Wake Lock API (mais moderno)
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('✅ Screen Wake Lock ativado');
                
                this.wakeLock.addEventListener('release', () => {
                    console.log('⚠️ Wake Lock foi liberado');
                });
            }
        } catch (err) {
            console.log('Wake Lock não suportado:', err);
        }

        try {
            // Método 2: Vídeo invisível (fallback)
            this.media = document.createElement('video');
            this.media.setAttribute('muted', '');
            this.media.setAttribute('playsinline', '');
            this.media.setAttribute('loop', '');
            this.media.style.position = 'fixed';
            this.media.style.top = '-1px';
            this.media.style.left = '-1px';
            this.media.style.width = '1px';
            this.media.style.height = '1px';
            this.media.style.opacity = '0.01';
            this.media.style.pointerEvents = 'none';
            
            // Vídeo de 1 pixel preto em base64
            this.media.src = 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMWRhc2gAAAAIZnJlZQAAAsNtZGF0AAACoAYF//+c3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDEyMCByMjE1MSBhM2Y0NDA3IC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxMSAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTEgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MToweDExMSBtZT1oZXggc3VibWU9MiBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0wIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MCA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0wIHRocmVhZHM9MSBsb29rYWhlYWRfdGhyZWFkcz0xIHNsaWNlZF90aHJlYWRzPTAgbnI9MCBkZWNpbWF0ZT0xIGludGVybGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTAgd2VpZ2h0cD0wIGtleWludD0yNTAga2V5aW50X21pbj0yNSBzY2VuZWN1dD00MCBpbnRyYV9yZWZyZXNoPTAgcmNfbG9va2FoZWFkPTEwIHJjPWNyZiBtYnRyZWU9MSBjcmY9MjMuMCBxY29tcD0wLjYwIHFwbWluPTEwIHFwbWF4PTUxIHFwc3RlcD00IHZidl9tYXhyYXRlPTIwMDAwIHZidl9idWZzaXplPTI1MDAwIGNyZl9tYXg9MC4wIG5hbF9ocmQ9bm9uZSBmaWxsZXI9MCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAD2WIhAA3//728P4FNjuY0EA=';
            
            document.body.appendChild(this.media);
            await this.media.play();
            console.log('✅ Vídeo invisível iniciado');
        } catch (err) {
            console.log('Vídeo fallback falhou:', err);
        }

        // Método 3: Simulação de atividade
        this.startActivitySimulation();
        
        this.enabled = true;
        console.log('🔒 NoSleep ativado');
    }

    disable() {
        if (!this.enabled) return;

        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }

        if (this.media) {
            this.media.pause();
            this.media.remove();
            this.media = null;
        }

        this.stopActivitySimulation();
        
        this.enabled = false;
        console.log('🔓 NoSleep desativado');
    }

    startActivitySimulation() {
        // Simula atividade tocando no documento a cada 30 segundos
        this.activityInterval = setInterval(() => {
            const event = new TouchEvent('touchstart', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            document.dispatchEvent(event);
        }, 30000);
    }

    stopActivitySimulation() {
        if (this.activityInterval) {
            clearInterval(this.activityInterval);
            this.activityInterval = null;
        }
    }
}

// Exportar para uso global
window.NoSleep = NoSleep;
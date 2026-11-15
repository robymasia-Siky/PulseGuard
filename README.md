# PulseGuard PC Monitor ⚡

Un'applicazione desktop moderna, ultra-veloce ed elegante per Windows per monitorare in tempo reale tutti i componenti hardware, temperature, percentuali d'uso, memorie, dischi e processi del tuo computer.

---

## 🚀 Caratteristiche Principali

- **Processore (CPU AMD Ryzen 7 5700X)**:
  - Percentuale di utilizzo complessivo con indicatore circolare al neon.
  - **Matrice a 16 Thread**: barre di equalizzazione in tempo reale per ciascuno dei 16 thread logici.
  - Temperatura CPU (°C / °F), Potenza Package (Watt), Tensione Core (Volt).
- **Scheda Video (GPU NVIDIA GeForce RTX 4060)**:
  - Carico GPU Core & Controller di Memoria in tempo reale.
  - **Doppio rilevamento termico**: Temperatura GPU Core e Hot Spot.
  - Monitoraggio memoria VRAM dedicata (utilizzata / totale in MB e GB).
  - Velocità ventole (percentuale e RPM) e frequenze di clock Core / Memoria.
- **Memoria di Sistema (RAM 32 GB DDR4)**:
  - RAM utilizzata, libera e totale.
  - Monitoraggio della memoria virtuale (file di paging / swap).
- **Archiviazione & Dischi**:
  - Stato di tutti i volumi (es. `C:`, `E:`).
  - Spazio occupato, disponibile e percentuale d'uso.
- **Connessione di Rete (Wi-Fi / Ethernet)**:
  - Monitoraggio a latenza zero tramite sensori nativi C#.
  - Velocità di **Download** e **Upload** in tempo reale (B/s, KB/s, MB/s).
  - Totale cumulativo dati ricevuti (Rx) e inviati (Tx).
- **Grafico Storico Dinamico (Live Rolling Chart)**:
  - Grafico Canvas a 60 fps con andamento degli ultimi 60 secondi per carico CPU, GPU e temperatura.
- **Gestione Processi (Task Manager integrato)**:
  - Elenco dei processi che consumano più risorse.
  - Ricerca istantanea per nome applicazione o PID.
  - Ordinamento per carico CPU % o memoria RAM.
  - Pulsante per terminare rapidamente processi bloccati.
- **Specifiche Hardware Complete**:
  - Dettagli completi su CPU, GPU, Scheda Madre (ASRock A520M-HVS), Sistema Operativo (Windows 11 Pro), BIOS e tempo di attività (Uptime).
- **Modalità Mini Widget (Desktop HUD)**:
  - Trasforma istantaneamente l'app in un widget galleggiante compatto (480x105 px) con numeri grandi da 30 px, posizionabile ovunque sullo schermo.
  - Scorciatoia rapida: premi **`F11`** o **`Ctrl + M`** per alternare al volo tra Dashboard e Widget HUD.
- **Sempre in Primo Piano (Always on Top)**:
  - Fissa l'app sopra giochi o altre finestre con un clic sull'icona della puntina.

---

## 🖥️ Come Avviare l'Applicazione

Puoi avviare PulseGuard in diversi modi:

1. **Dal Desktop di Windows**:
   - Fai doppio clic sul collegamento **PulseGuard PC Monitor** presente sul tuo Desktop.
2. **Dalla cartella del progetto**:
   - Doppio clic su `Avvia-PulseGuard.bat`.
3. **Da Terminale**:
   ```bash
   npm start
   ```

---

## 🛠️ Tecnologie Utilizzate

- **Electron** (Frontend e gestione finestre desktop)
- **Vanilla JS, HTML5 & CSS3** (Interfaccia moderna dark-neon ad alto contrasto senza dipendenze pesanti)
- **C# / .NET SensorBridge** (Bridge nativo ad alte prestazioni con LibreHardwareMonitorLib per la telemetria Ring-0 e System.Net per la rete)
- **systeminformation** (Query hardware, partizioni dischi e processi di sistema)

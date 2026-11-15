using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.NetworkInformation;
using System.Security.Principal;
using System.Text;
using System.Threading;
using LibreHardwareMonitor.Hardware;

class Program
{
    static void Main(string[] args)
    {
        int intervalMs = 1000;
        if (args.Length > 0)
        {
            int customInterval;
            if (int.TryParse(args[0], out customInterval) && customInterval >= 250)
            {
                intervalMs = customInterval;
            }
        }

        bool isAdmin = false;
        try
        {
            WindowsIdentity id = WindowsIdentity.GetCurrent();
            WindowsPrincipal principal = new WindowsPrincipal(id);
            isAdmin = principal.IsInRole(WindowsBuiltInRole.Administrator);
        }
        catch { }

        Computer computer = new Computer
        {
            IsCpuEnabled = true,
            IsGpuEnabled = true,
            IsMotherboardEnabled = true,
            IsMemoryEnabled = true,
            IsStorageEnabled = true,
            IsControllerEnabled = true,
            IsNetworkEnabled = false
        };

        try
        {
            computer.Open();
        }
        catch (Exception ex)
        {
            Console.WriteLine("{\"error\":\"Failed to open hardware monitor: " + Escape(ex.Message) + "\"}");
            return;
        }

        AppDomain.CurrentDomain.ProcessExit += delegate {
            try { computer.Close(); } catch { }
        };

        bool running = true;
        Thread stdinWatcher = new Thread(delegate()
        {
            string line;
            while ((line = Console.ReadLine()) != null)
            {
                line = line.Trim();
                if (line == "quit" || line == "exit")
                {
                    running = false;
                    break;
                }
                if (line.StartsWith("interval "))
                {
                    int newInt;
                    if (int.TryParse(line.Substring(9), out newInt) && newInt >= 200)
                    {
                        intervalMs = newInt;
                    }
                }
            }
            running = false;
        });
        stdinWatcher.IsBackground = true;
        stdinWatcher.Start();

        CultureInfo inv = CultureInfo.InvariantCulture;
        DateTime epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        while (running)
        {
            try
            {
                StringBuilder sb = new StringBuilder();
                sb.Append("{");
                sb.Append("\"isAdmin\":" + (isAdmin ? "true" : "false") + ",");

                // CPU variables
                string cpuName = "";
                double? cpuTotalLoad = null;
                List<string> cpuCoreLoads = new List<string>();
                double? cpuTemp = null;
                double? cpuPower = null;
                double? cpuVoltage = null;
                double? cpuAvgClock = null;
                List<string> cpuCoreClocks = new List<string>();

                // GPU variables
                string gpuName = "";
                double? gpuCoreLoad = null;
                double? gpuMemLoad = null;
                double? gpuTemp = null;
                double? gpuHotspot = null;
                double? gpuFanPercent = null;
                double? gpuFanRpm = null;
                double? gpuPower = null;
                double? gpuCoreClock = null;
                double? gpuMemClock = null;
                double? gpuVramUsedMb = null;
                double? gpuVramTotalMb = null;
                double? gpuVramFreeMb = null;

                // Memory variables
                double? ramTotalGb = null;
                double? ramUsedGb = null;
                double? ramFreeGb = null;
                double? ramLoadPercent = null;
                double? vRamUsedGb = null;
                double? vRamFreeGb = null;
                double? vRamLoadPercent = null;

                // Storage & Others
                List<string> otherTemps = new List<string>();
                List<string> fans = new List<string>();
                List<string> storageList = new List<string>();

                foreach (IHardware hw in computer.Hardware)
                {
                    hw.Update();

                    foreach (IHardware sub in hw.SubHardware)
                    {
                        sub.Update();
                        ProcessHardware(sub, ref cpuName, ref cpuTotalLoad, cpuCoreLoads, ref cpuTemp, ref cpuPower, ref cpuVoltage, ref cpuAvgClock, cpuCoreClocks,
                            ref gpuName, ref gpuCoreLoad, ref gpuMemLoad, ref gpuTemp, ref gpuHotspot, ref gpuFanPercent, ref gpuFanRpm, ref gpuPower, ref gpuCoreClock, ref gpuMemClock, ref gpuVramUsedMb, ref gpuVramTotalMb, ref gpuVramFreeMb,
                            ref ramTotalGb, ref ramUsedGb, ref ramFreeGb, ref ramLoadPercent, ref vRamUsedGb, ref vRamFreeGb, ref vRamLoadPercent,
                            otherTemps, fans, storageList, inv);
                    }

                    ProcessHardware(hw, ref cpuName, ref cpuTotalLoad, cpuCoreLoads, ref cpuTemp, ref cpuPower, ref cpuVoltage, ref cpuAvgClock, cpuCoreClocks,
                        ref gpuName, ref gpuCoreLoad, ref gpuMemLoad, ref gpuTemp, ref gpuHotspot, ref gpuFanPercent, ref gpuFanRpm, ref gpuPower, ref gpuCoreClock, ref gpuMemClock, ref gpuVramUsedMb, ref gpuVramTotalMb, ref gpuVramFreeMb,
                        ref ramTotalGb, ref ramUsedGb, ref ramFreeGb, ref ramLoadPercent, ref vRamUsedGb, ref vRamFreeGb, ref vRamLoadPercent,
                        otherTemps, fans, storageList, inv);
                }

                // If RAM total is null, calculate from used + free
                if (!ramTotalGb.HasValue && ramUsedGb.HasValue && ramFreeGb.HasValue)
                {
                    ramTotalGb = ramUsedGb.Value + ramFreeGb.Value;
                }

                // Build CPU JSON
                sb.Append("\"cpu\":{");
                sb.Append("\"name\":\"" + Escape(cpuName) + "\",");
                sb.Append("\"totalLoad\":" + (cpuTotalLoad.HasValue ? cpuTotalLoad.Value.ToString("F1", inv) : "0") + ",");
                sb.Append("\"coreLoads\":[" + string.Join(",", cpuCoreLoads.ToArray()) + "],");
                sb.Append("\"temp\":" + (cpuTemp.HasValue ? cpuTemp.Value.ToString("F1", inv) : "null") + ",");
                sb.Append("\"power\":" + (cpuPower.HasValue ? cpuPower.Value.ToString("F1", inv) : "null") + ",");
                sb.Append("\"voltage\":" + (cpuVoltage.HasValue ? cpuVoltage.Value.ToString("F2", inv) : "null") + ",");
                sb.Append("\"avgClock\":" + (cpuAvgClock.HasValue ? cpuAvgClock.Value.ToString("F0", inv) : "null") + ",");
                sb.Append("\"coreClocks\":[" + string.Join(",", cpuCoreClocks.ToArray()) + "]");
                sb.Append("},");

                // Build GPU JSON
                sb.Append("\"gpu\":{");
                sb.Append("\"name\":\"" + Escape(gpuName) + "\",");
                sb.Append("\"coreLoad\":" + (gpuCoreLoad.HasValue ? gpuCoreLoad.Value.ToString("F1", inv) : "0") + ",");
                sb.Append("\"memLoad\":" + (gpuMemLoad.HasValue ? gpuMemLoad.Value.ToString("F1", inv) : "0") + ",");
                sb.Append("\"temp\":" + (gpuTemp.HasValue ? gpuTemp.Value.ToString("F1", inv) : "null") + ",");
                sb.Append("\"hotspot\":" + (gpuHotspot.HasValue ? gpuHotspot.Value.ToString("F1", inv) : "null") + ",");
                sb.Append("\"fanPercent\":" + (gpuFanPercent.HasValue ? gpuFanPercent.Value.ToString("F0", inv) : "0") + ",");
                sb.Append("\"fanRpm\":" + (gpuFanRpm.HasValue ? gpuFanRpm.Value.ToString("F0", inv) : "null") + ",");
                sb.Append("\"power\":" + (gpuPower.HasValue ? gpuPower.Value.ToString("F1", inv) : "null") + ",");
                sb.Append("\"coreClock\":" + (gpuCoreClock.HasValue ? gpuCoreClock.Value.ToString("F0", inv) : "null") + ",");
                sb.Append("\"memClock\":" + (gpuMemClock.HasValue ? gpuMemClock.Value.ToString("F0", inv) : "null") + ",");
                sb.Append("\"vramUsedMb\":" + (gpuVramUsedMb.HasValue ? gpuVramUsedMb.Value.ToString("F0", inv) : "null") + ",");
                sb.Append("\"vramTotalMb\":" + (gpuVramTotalMb.HasValue ? gpuVramTotalMb.Value.ToString("F0", inv) : "null") + ",");
                sb.Append("\"vramFreeMb\":" + (gpuVramFreeMb.HasValue ? gpuVramFreeMb.Value.ToString("F0", inv) : "null"));
                sb.Append("},");

                // Build RAM JSON
                sb.Append("\"ram\":{");
                sb.Append("\"totalGb\":" + (ramTotalGb.HasValue ? ramTotalGb.Value.ToString("F2", inv) : "null") + ",");
                sb.Append("\"usedGb\":" + (ramUsedGb.HasValue ? ramUsedGb.Value.ToString("F2", inv) : "null") + ",");
                sb.Append("\"freeGb\":" + (ramFreeGb.HasValue ? ramFreeGb.Value.ToString("F2", inv) : "null") + ",");
                sb.Append("\"loadPercent\":" + (ramLoadPercent.HasValue ? ramLoadPercent.Value.ToString("F1", inv) : "0") + ",");
                sb.Append("\"vUsedGb\":" + (vRamUsedGb.HasValue ? vRamUsedGb.Value.ToString("F2", inv) : "null") + ",");
                sb.Append("\"vFreeGb\":" + (vRamFreeGb.HasValue ? vRamFreeGb.Value.ToString("F2", inv) : "null") + ",");
                sb.Append("\"vLoadPercent\":" + (vRamLoadPercent.HasValue ? vRamLoadPercent.Value.ToString("F1", inv) : "0"));
                sb.Append("},");

                // Network Telemetry
                string netIface = "";
                double netRxSec = 0;
                double netTxSec = 0;
                long netTotalRx = 0;
                long netTotalTx = 0;
                GetNetworkTelemetry(out netIface, out netRxSec, out netTxSec, out netTotalRx, out netTotalTx);

                sb.Append("\"network\":{");
                sb.Append("\"iface\":\"" + Escape(netIface) + "\",");
                sb.Append("\"rxSec\":" + netRxSec.ToString("F1", inv) + ",");
                sb.Append("\"txSec\":" + netTxSec.ToString("F1", inv) + ",");
                sb.Append("\"totalRx\":" + netTotalRx + ",");
                sb.Append("\"totalTx\":" + netTotalTx);
                sb.Append("},");

                sb.Append("\"storage\":[" + string.Join(",", storageList.ToArray()) + "],");
                sb.Append("\"fans\":[" + string.Join(",", fans.ToArray()) + "],");
                sb.Append("\"otherTemps\":[" + string.Join(",", otherTemps.ToArray()) + "],");

                long ms = (long)(DateTime.UtcNow - epoch).TotalMilliseconds;
                sb.Append("\"timestamp\":" + ms);
                sb.Append("}");

                Console.WriteLine(sb.ToString());
            }
            catch (Exception ex)
            {
                Console.WriteLine("{\"error\":\"" + Escape(ex.Message) + "\"}");
            }

            Thread.Sleep(intervalMs);
        }

        try { computer.Close(); } catch { }
    }

    static void ProcessHardware(
        IHardware hw,
        ref string cpuName,
        ref double? cpuTotalLoad,
        List<string> cpuCoreLoads,
        ref double? cpuTemp,
        ref double? cpuPower,
        ref double? cpuVoltage,
        ref double? cpuAvgClock,
        List<string> cpuCoreClocks,
        ref string gpuName,
        ref double? gpuCoreLoad,
        ref double? gpuMemLoad,
        ref double? gpuTemp,
        ref double? gpuHotspot,
        ref double? gpuFanPercent,
        ref double? gpuFanRpm,
        ref double? gpuPower,
        ref double? gpuCoreClock,
        ref double? gpuMemClock,
        ref double? gpuVramUsedMb,
        ref double? gpuVramTotalMb,
        ref double? gpuVramFreeMb,
        ref double? ramTotalGb,
        ref double? ramUsedGb,
        ref double? ramFreeGb,
        ref double? ramLoadPercent,
        ref double? vRamUsedGb,
        ref double? vRamFreeGb,
        ref double? vRamLoadPercent,
        List<string> otherTemps,
        List<string> fans,
        List<string> storageList,
        CultureInfo inv)
    {
        bool isCpu = hw.HardwareType == HardwareType.Cpu;
        bool isGpu = hw.HardwareType == HardwareType.GpuNvidia || hw.HardwareType == HardwareType.GpuAmd || hw.HardwareType == HardwareType.GpuIntel;
        bool isMemory = hw.HardwareType == HardwareType.Memory;
        bool isStorage = hw.HardwareType == HardwareType.Storage;

        if (isCpu && string.IsNullOrEmpty(cpuName)) cpuName = hw.Name;
        if (isGpu && string.IsNullOrEmpty(gpuName)) gpuName = hw.Name;

        // Process Storage hardware
        if (isStorage)
        {
            double? driveTemp = null;
            double? driveUsedPercent = null;
            foreach (ISensor s in hw.Sensors)
            {
                if (!s.Value.HasValue) continue;
                if (s.SensorType == SensorType.Temperature && s.Value.Value > 0)
                {
                    driveTemp = s.Value.Value;
                }
                else if (s.SensorType == SensorType.Load && s.Name.IndexOf("Used", StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    driveUsedPercent = s.Value.Value;
                }
            }
            storageList.Add(string.Format(inv, "{{\"name\":\"{0}\",\"temp\":{1},\"usedPercent\":{2}}}",
                Escape(hw.Name),
                driveTemp.HasValue ? driveTemp.Value.ToString("F1", inv) : "null",
                driveUsedPercent.HasValue ? driveUsedPercent.Value.ToString("F1", inv) : "null"));
        }

        foreach (ISensor s in hw.Sensors)
        {
            if (!s.Value.HasValue) continue;
            double val = s.Value.Value;

            if (isCpu)
            {
                if (s.SensorType == SensorType.Load)
                {
                    if (s.Name == "CPU Total")
                    {
                        cpuTotalLoad = val;
                    }
                    else if (s.Name.StartsWith("CPU Core #"))
                    {
                        cpuCoreLoads.Add(val.ToString("F1", inv));
                    }
                }
                else if (s.SensorType == SensorType.Temperature)
                {
                    if (val > 0)
                    {
                        if (s.Name.IndexOf("Tctl", StringComparison.OrdinalIgnoreCase) >= 0 ||
                            s.Name.IndexOf("Package", StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            cpuTemp = val; // Priority 1: Tctl/Tdie or Package
                        }
                        else if (!cpuTemp.HasValue && (s.Name.IndexOf("Core", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                                       s.Name.IndexOf("CCD", StringComparison.OrdinalIgnoreCase) >= 0 ||
                                                       s.Name.IndexOf("CPU", StringComparison.OrdinalIgnoreCase) >= 0))
                        {
                            cpuTemp = val; // Priority 2: CPU Core / CCD / CPU
                        }
                    }
                }
                else if (s.SensorType == SensorType.Power && val > 0)
                {
                    if (s.Name.IndexOf("Package", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        s.Name.IndexOf("Core", StringComparison.OrdinalIgnoreCase) >= 0 ||
                        s.Name.IndexOf("SMU", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        if (!cpuPower.HasValue) cpuPower = val;
                    }
                }
                else if (s.SensorType == SensorType.Voltage && val > 0)
                {
                    if (s.Name.IndexOf("Core (SVI2 TFN)", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        cpuVoltage = val; // Best AMD Zen voltage sensor
                    }
                    else if (!cpuVoltage.HasValue && (s.Name.IndexOf("Core", StringComparison.OrdinalIgnoreCase) >= 0 || s.Name.IndexOf("VID", StringComparison.OrdinalIgnoreCase) >= 0))
                    {
                        cpuVoltage = val;
                    }
                }
                else if (s.SensorType == SensorType.Clock && val > 0)
                {
                    if (s.Name.IndexOf("Average", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        cpuAvgClock = val;
                    }
                    else if (s.Name.StartsWith("Core #") && s.Name.IndexOf("Effective", StringComparison.OrdinalIgnoreCase) < 0)
                    {
                        cpuCoreClocks.Add(val.ToString("F0", inv));
                    }
                }
            }
            else if (isGpu)
            {
                if (s.SensorType == SensorType.Load)
                {
                    if (s.Name.IndexOf("Core", StringComparison.OrdinalIgnoreCase) >= 0 || s.Name == "GPU Core")
                    {
                        gpuCoreLoad = val;
                    }
                    else if (s.Name.IndexOf("Memory", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        gpuMemLoad = val;
                    }
                }
                else if (s.SensorType == SensorType.Temperature)
                {
                    if (s.Name.IndexOf("Hot", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        gpuHotspot = val;
                    }
                    else if (s.Name.IndexOf("Core", StringComparison.OrdinalIgnoreCase) >= 0 || s.Name.IndexOf("GPU", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        if (!gpuTemp.HasValue) gpuTemp = val;
                    }
                }
                else if (s.SensorType == SensorType.Fan)
                {
                    if (s.Name.IndexOf("Fan", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        gpuFanRpm = val;
                    }
                }
                else if (s.SensorType == SensorType.Control)
                {
                    if (s.Name.IndexOf("Fan", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        gpuFanPercent = val;
                    }
                }
                else if (s.SensorType == SensorType.Power && val > 0)
                {
                    gpuPower = val;
                }
                else if (s.SensorType == SensorType.Clock)
                {
                    if (s.Name.IndexOf("Core", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        gpuCoreClock = val;
                    }
                    else if (s.Name.IndexOf("Memory", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        gpuMemClock = val;
                    }
                }
                else if (s.SensorType == SensorType.SmallData)
                {
                    if (s.Name.IndexOf("Memory Total", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        gpuVramTotalMb = val;
                    }
                    else if (s.Name.IndexOf("Memory Used", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        gpuVramUsedMb = val;
                    }
                    else if (s.Name.IndexOf("Memory Free", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        gpuVramFreeMb = val;
                    }
                }
            }
            else if (isMemory)
            {
                if (hw.Name == "Generic Memory" || hw.Name == "Total Memory")
                {
                    if (s.SensorType == SensorType.Data)
                    {
                        if (s.Name.IndexOf("Used", StringComparison.OrdinalIgnoreCase) >= 0) ramUsedGb = val;
                        else if (s.Name.IndexOf("Available", StringComparison.OrdinalIgnoreCase) >= 0) ramFreeGb = val;
                    }
                    else if (s.SensorType == SensorType.Load && s.Name.IndexOf("Memory", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        ramLoadPercent = val;
                    }
                }
                else if (hw.Name == "Virtual Memory")
                {
                    if (s.SensorType == SensorType.Data)
                    {
                        if (s.Name.IndexOf("Used", StringComparison.OrdinalIgnoreCase) >= 0) vRamUsedGb = val;
                        else if (s.Name.IndexOf("Available", StringComparison.OrdinalIgnoreCase) >= 0) vRamFreeGb = val;
                    }
                    else if (s.SensorType == SensorType.Load && s.Name.IndexOf("Memory", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        vRamLoadPercent = val;
                    }
                }
            }
            else
            {
                // Motherboard / other sensors
                if (s.SensorType == SensorType.Temperature && val > 0)
                {
                    if (!cpuTemp.HasValue && (s.Name.Equals("CPU", StringComparison.OrdinalIgnoreCase) || s.Name.IndexOf("CPU", StringComparison.OrdinalIgnoreCase) >= 0))
                    {
                        cpuTemp = val;
                    }
                    otherTemps.Add(string.Format(inv, "{{\"hardware\":\"{0}\",\"name\":\"{1}\",\"value\":{2:F1}}}",
                        Escape(hw.Name), Escape(s.Name), val));
                }
                else if (s.SensorType == SensorType.Fan && val > 0)
                {
                    fans.Add(string.Format(inv, "{{\"hardware\":\"{0}\",\"name\":\"{1}\",\"rpm\":{2:F0}}}",
                        Escape(hw.Name), Escape(s.Name), val));
                }
            }
        }
    }

    static long prevNetRx = -1;
    static long prevNetTx = -1;
    static DateTime prevNetTime = DateTime.MinValue;
    static string cachedNetName = "Wi-Fi (Realtek 8821CU)";

    static void GetNetworkTelemetry(out string ifaceName, out double rxSec, out double txSec, out long totalRx, out long totalTx)
    {
        ifaceName = cachedNetName;
        rxSec = 0;
        txSec = 0;
        totalRx = 0;
        totalTx = 0;

        try
        {
            NetworkInterface activeNic = null;
            long maxBytes = -1;

            foreach (NetworkInterface nic in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (nic.OperationalStatus == OperationalStatus.Up &&
                    nic.NetworkInterfaceType != NetworkInterfaceType.Loopback &&
                    nic.NetworkInterfaceType != NetworkInterfaceType.Tunnel)
                {
                    IPv4InterfaceStatistics stats = nic.GetIPv4Statistics();
                    long currentTotal = stats.BytesReceived + stats.BytesSent;
                    if (currentTotal > maxBytes)
                    {
                        maxBytes = currentTotal;
                        activeNic = nic;
                    }
                }
            }

            if (activeNic != null)
            {
                string desc = activeNic.Description;
                string name = activeNic.Name;
                if (!string.IsNullOrEmpty(desc) && desc != name)
                {
                    ifaceName = name + " (" + desc + ")";
                }
                else
                {
                    ifaceName = name;
                }
                cachedNetName = ifaceName;

                IPv4InterfaceStatistics s = activeNic.GetIPv4Statistics();
                totalRx = s.BytesReceived;
                totalTx = s.BytesSent;

                DateTime now = DateTime.UtcNow;
                if (prevNetRx >= 0 && prevNetTime > DateTime.MinValue)
                {
                    double elapsed = (now - prevNetTime).TotalSeconds;
                    if (elapsed > 0.1)
                    {
                        long dRx = totalRx - prevNetRx;
                        long dTx = totalTx - prevNetTx;
                        if (dRx > 0) rxSec = dRx / elapsed;
                        if (dTx > 0) txSec = dTx / elapsed;
                    }
                }

                prevNetRx = totalRx;
                prevNetTx = totalTx;
                prevNetTime = now;
            }
        }
        catch
        {
            ifaceName = cachedNetName;
        }
    }

    static string Escape(string s)
    {
        if (s == null) return "";
        return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", "\\n").Replace("\r", "");
    }
}

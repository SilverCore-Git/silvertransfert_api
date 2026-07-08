import checkDiskSpace from "check-disk-space";
import fs from "fs";
import path from "path";
import axios from "axios";
import { dev } from '../../../../package.json';

export default class DiskReporter {
        
    private dbPath: string;
    private webhookUrl: string;

    constructor(dbPath: string, webhookUrl: string) {
        this.dbPath = dbPath;
        this.webhookUrl = webhookUrl;
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return "0 o";
        const sizes = ["o", "Ko", "Mo", "Go", "To", "Po"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(2) + " " + sizes[i];
    }

    private loadDatabase(): any[] {
        const fullPath = path.resolve(this.dbPath);
        const raw = fs.readFileSync(fullPath, "utf-8");
        return Object.values(JSON.parse(raw));
    }

    private async buildReport(): Promise<any> {
        const entries = this.loadDatabase();
        const totalTransfers = entries.length;

        // Total storage used by transfers
        let totalSize = 0;
        for (const entry of entries) {
            totalSize += entry.size || 0;
        }

        // Disk info
        const diskPath = dev ? "C:\\Users\\felix\\OneDrive\\Documents\\SilverCore\\app\\SilverTransfert\\app\\dist\\data" : "/mnt/data";
        const disk = await checkDiskSpace(diskPath);

        // Formatting
        const totalSizeFormatted = this.formatBytes(totalSize);
        const diskSizeFormatted = this.formatBytes(disk.size);
        const freeSizeFormatted = this.formatBytes(disk.free);
        
        // Calcul du vrai pourcentage d'utilisation du disque (plutôt que par rapport à la taille totale des transferts)
        const diskUsedBytes = disk.size - disk.free;
        const percentUsed = ((diskUsedBytes / disk.size) * 100).toFixed(2) + "%";

        // Embed Discord
        return {
            embeds: [
                {
                    title: "📦 Rapport Silvertransfert — Stockage",
                    color: 0x0099ff, // Bleu
                    fields: [
                        { name: "🗂️ Nombre de transferts", value: `${totalTransfers}`, inline: true },
                        { name: "💾 Taille totale utilisée", value: `${totalSizeFormatted}`, inline: true },
                        { name: "\u200B", value: "\u200B", inline: false }, // Ligne vide valide
                        
                        // FIX ICI : Discord refuse la value vide. On met un point de repère ou une icône
                        { name: "🖥️ État du Disque Système", value: `Logs pour \`${diskPath}\``, inline: false },
                        
                        { name: "Taille totale", value: `${diskSizeFormatted}`, inline: true },
                        { name: "Libre", value: `${freeSizeFormatted}`, inline: true },
                        { name: "Utilisation du disque", value: `${percentUsed}`, inline: true },
                    ],
                    footer: {
                        text: `Rapport généré automatiquement`,
                    },
                    timestamp: new Date().toISOString()
                }
            ]
        };
    }

    private async sendToDiscord(payload: any) {
        const res = await axios.post(this.webhookUrl, payload);
    }

    public async run() {
        try {
            console.log("📡 Génération du rapport SilverTransfer...");
            const report = await this.buildReport();
            await this.sendToDiscord(report);
            console.log("✅ Rapport envoyé avec succès !");
        } catch (err: any) {
            // Permet d'avoir le vrai message d'erreur d'Axios si Discord refuse le payload
            const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            console.error(`❌ Erreur lors du rapport : ${errorMsg}`);
        }
    }
}
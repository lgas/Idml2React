import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { IdmlParser } from '@parsers/index';


async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error('❌ Usage: npm start <chemin/vers/fichier.idml>');
        process.exit(1);
    }
    
    const inputPath = resolve(args[0]);
    
    try {
        console.log(`🔍 Parsing ${inputPath}...`);
        const result = await IdmlParser.parseFile(inputPath);
        
        // Sauvegarde du résultat
        const outputPath = inputPath.replace(/\.idml$/i, '.json');
        writeFileSync(outputPath, JSON.stringify(result, null, 2));
        
        console.log(`✅ Fichier JSON généré : ${outputPath}`);
        console.log(`📊 Stats : ${result.spreads.length} spreads, ${result.stories.length} stories`);
        
    } catch (error) {
        console.error('❌ Erreur :', error);
        process.exit(1);
    }
}

main();
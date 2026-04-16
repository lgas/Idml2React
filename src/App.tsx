import React from 'react';
import { useIdmlToReact } from './hooks/useIdmlToReact.js';

import { SpreadRenderer } from '@components/SpreadRenderer';

function App() {
    const { spreads, loading, error } = useIdmlToReact('../assets/poc-layout.idml');
    
    if (loading) return <div className="loading">Chargement du document...</div>;
    if (error) return <div className="error">Erreur: {error.message}</div>;
    
    return (
        <div className="idml-document">
            {spreads.map((spread) => (
                <SpreadRenderer key={spread.id} spread={spread} />
            ))}
        </div>
    );
}

export default App;
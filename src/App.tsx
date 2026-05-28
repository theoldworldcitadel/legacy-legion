import { useState, useMemo, useEffect } from 'react';
import './App.css';
import logo from './assets/legacy-legion-logo.jpg';

interface Player {
  id: number;
  name: string;
  faction: string;
  legion: string;
  paintingBonus: number;
  narrativeBonus: number;
  vpRounds: number[];
  objectivePoints: number;
  slayerPoints: number;
  totalVP: number;
}

interface Pairing {
  round: number;
  matches: Array<{ player1: Player; player2: Player }>;
}

const App = () => {
  const [numLegions, setNumLegions] = useState(4);
  const [playersPerLegion, setPlayersPerLegion] = useState(6);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newPlayer, setNewPlayer] = useState({ name: '', faction: '', legion: '' });
  const [rounds] = useState(4);
  const [search, setSearch] = useState('');
  const [selectedLegion, setSelectedLegion] = useState<string>("All");
  const [currentRound, setCurrentRound] = useState(1);
  const [pairings, setPairings] = useState<Pairing[]>([]);

  // Persistent Storage
  useEffect(() => {
    const saved = localStorage.getItem('legacyLegionPlayers');
    if (saved) setPlayers(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('legacyLegionPlayers', JSON.stringify(players));
  }, [players]);

  const addPlayer = () => {
    if (!newPlayer.name || !newPlayer.legion) {
      alert("Name and Legion are required!");
      return;
    }
    const player: Player = {
      id: Date.now(),
      name: newPlayer.name,
      faction: newPlayer.faction || 'Unknown',
      legion: newPlayer.legion,
      paintingBonus: 0,
      narrativeBonus: 0,
      vpRounds: Array(rounds).fill(0),
      objectivePoints: 0,
      slayerPoints: 0,
      totalVP: 0,
    };
    setPlayers([...players, player]);
    setNewPlayer({ name: '', faction: '', legion: '' });
  };

  const updatePlayer = (id: number, field: keyof Player, value: any) => {
    setPlayers(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, [field]: value };
      const totalBattleVP = updated.vpRounds.reduce((a, b) => a + b, 0);
      updated.totalVP = totalBattleVP + updated.paintingBonus + updated.narrativeBonus;
      return updated;
    }));
  };

  const resetAllData = () => {
    if (window.confirm("⚠️ Reset ALL data? This cannot be undone!")) {
      localStorage.clear();
      setPlayers([]);
      setPairings([]);
      setSelectedLegion("All");
      alert("App has been reset.");
    }
  };

  const generatePairings = () => {
    if (players.length < 2) return alert("Need at least 2 players!");

    const sorted = [...players].sort((a, b) => b.totalVP - a.totalVP);
    const matches: Array<{ player1: Player; player2: Player }> = [];
    const used = new Set<number>();

    for (let i = 0; i < sorted.length; i++) {
      if (used.has(sorted[i].id)) continue;
      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(sorted[j].id)) continue;
        if (sorted[i].legion === sorted[j].legion) continue;

        matches.push({ player1: sorted[i], player2: sorted[j] });
        used.add(sorted[i].id);
        used.add(sorted[j].id);
        break;
      }
    }

    const newPairing: Pairing = { round: currentRound, matches };
    setPairings(prev => [...prev.filter(p => p.round !== currentRound), newPairing]);
    alert(`✅ Round ${currentRound} pairings generated!`);
  };

  const currentPairing = pairings.find(p => p.round === currentRound);

  const allLegions = useMemo(() => Array.from(new Set(players.map(p => p.legion))), [players]);

  const displayedPlayers = useMemo(() => {
    if (selectedLegion === "All") return players;
    return players.filter(p => p.legion === selectedLegion);
  }, [players, selectedLegion]);

  const legionAwards = useMemo(() => {
    const map = new Map<string, any>();
    players.forEach(p => {
      if (!map.has(p.legion)) map.set(p.legion, { totalVP: 0, count: 0, players: [] });
      const data = map.get(p.legion)!;
      data.totalVP += p.totalVP;
      data.count += 1;
      data.players.push(p);
    });

    return Array.from(map.entries())
      .map(([name, data]) => {
        const playersInLegion = data.players;
        const bestGeneral = [...playersInLegion].sort((a, b) => b.totalVP - a.totalVP)[0];
        const objectiveKing = [...playersInLegion].sort((a, b) => 
          b.objectivePoints !== a.objectivePoints ? b.objectivePoints - a.objectivePoints : b.totalVP - a.totalVP
        )[0];
        const slayerKing = [...playersInLegion].sort((a, b) => 
          b.slayerPoints !== a.slayerPoints ? b.slayerPoints - a.slayerPoints : b.totalVP - a.totalVP
        )[0];

        return { legion: name, totalVP: data.totalVP, playerCount: data.count, bestGeneral, objectiveKing, slayerKing };
      })
      .sort((a, b) => b.totalVP - a.totalVP);
  }, [players]);

  return (
    <div className="app">
      <header>
        <img src={logo} alt="Legacy Legions" className="logo" />
        <p className="subtitle">Warhammer: The Old World • Next-Gen Event System</p>
      </header>

      {/* All previous sections remain the same */}
      <div className="config">
        <h2>Event Configuration</h2>
        <label>Number of Legions: <input type="number" value={numLegions} onChange={e => setNumLegions(Number(e.target.value))} min="1" /></label>
        <label>Generals per Legion: <input type="number" value={playersPerLegion} onChange={e => setPlayersPerLegion(Number(e.target.value))} min="2" /></label>
        <button onClick={resetAllData} style={{background: '#8b0000', marginLeft: '15px'}}>Reset All Data</button>
      </div>

      <div className="pairing">
        <h2>Legion Assignment</h2>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center'}}>
          <button onClick={() => setSelectedLegion("All")}>Manual Assignment</button>
          <button onClick={() => {
            const shuffled = [...players].sort(() => 0.5 - Math.random());
            const newPlayers = shuffled.map((p, i) => ({ ...p, legion: `Legion ${Math.floor(i / playersPerLegion) + 1}` }));
            setPlayers(newPlayers);
          }}>Random (Free For All)</button>
          <button onClick={() => {
            const goodFactions = ["Dwarfen Mountain Holds", "Empire of Man", "Grand Cathay", "High Elf Realms", "Kingdom of Bretonnia", "Lizardmen", "Ogre Kingdoms", "Wood Elf Realms"];
            const newPlayers = players.map(p => ({
              ...p,
              legion: goodFactions.some(g => p.faction.includes(g)) ? "Good" : "Evil"
            }));
            setPlayers(newPlayers);
          }}>Good vs Evil</button>
        </div>
      </div>

      <div className="pairing">
        <h2>Round Pairing System</h2>
        <label>Current Round: 
          <select value={currentRound} onChange={e => setCurrentRound(Number(e.target.value))}>
            {[1,2,3,4].map(r => <option key={r} value={r}>Round {r}</option>)}
          </select>
        </label>
        <button onClick={generatePairings} style={{background: '#8b0000', padding: '12px 20px', margin: '10px'}}>
          Generate Round {currentRound} Pairings
        </button>

        {currentPairing && (
          <div className="pairings-display">
            <h3>Round {currentPairing.round} Matchups</h3>
            {currentPairing.matches.map((match, idx) => (
              <div key={idx} className="match-card" style={{background: '#1a1a1a', padding: '15px', margin: '10px 0', borderRadius: '8px', border: '1px solid #8b0000'}}>
                <strong>{match.player1.name}</strong> ({match.player1.legion} — {match.player1.totalVP} VP)<br />
                <strong style={{color: '#c5a26b'}}>VS</strong><br />
                <strong>{match.player2.name}</strong> ({match.player2.legion} — {match.player2.totalVP} VP)
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New General, View Legion, Standings, Awards, Players List sections remain unchanged */}
      <div className="add-player">
        <h2>Add New General</h2>
        <input type="text" placeholder="General Name" value={newPlayer.name} onChange={e => setNewPlayer({...newPlayer, name: e.target.value})} />
        <select value={newPlayer.faction} onChange={e => setNewPlayer({...newPlayer, faction: e.target.value})}>
          <option value="">Select Faction / Army</option>
          <optgroup label="Grand Armies">
            <option value="Beastmen Brayherds">Beastmen Brayherds</option>
            <option value="Dwarfen Mountain Holds">Dwarfen Mountain Holds</option>
            <option value="Empire of Man">Empire of Man</option>
            <option value="Grand Cathay">Grand Cathay</option>
            <option value="High Elf Realms">High Elf Realms</option>
            <option value="Kingdom of Bretonnia">Kingdom of Bretonnia</option>
            <option value="Orc & Goblin Tribes">Orc & Goblin Tribes</option>
            <option value="Tomb Kings of Khemri">Tomb Kings of Khemri</option>
            <option value="Warriors of Chaos">Warriors of Chaos</option>
            <option value="Wood Elf Realms">Wood Elf Realms</option>
          </optgroup>
          <optgroup label="Armies of Infamy">
            <option value="Chaos Dwarfs">Chaos Dwarfs</option>
            <option value="Daemons of Chaos">Daemons of Chaos</option>
            <option value="Dark Elves">Dark Elves</option>
            <option value="Lizardmen">Lizardmen</option>
            <option value="Ogre Kingdoms">Ogre Kingdoms</option>
            <option value="Skaven">Skaven</option>
            <option value="Vampire Counts">Vampire Counts</option>
          </optgroup>
        </select>
        <input type="text" placeholder="Legion Name" value={newPlayer.legion} onChange={e => setNewPlayer({...newPlayer, legion: e.target.value})} />
        <button onClick={addPlayer}>Add General</button>
      </div>

      {/* ... (other sections like legion-selector, dashboard, awards, players-list are kept the same) ... */}

      {/* NEW DISCLAIMER */}
      <footer style={{
        textAlign: 'center',
        padding: '30px 20px',
        marginTop: '40px',
        borderTop: '2px solid #8b0000',
        color: '#b38b5d',
        fontSize: '0.95rem',
        lineHeight: '1.5'
      }}>
        <p>This app is unofficial and unendorsed by Games Workshop.</p>
        <p>Created by the Warhammer The Old World Community Podcast &amp; Old World Tavern Magazine.</p>
        <p>
          Support us on Patreon: <a href="https://www.patreon.com/c/TheOldWorldCommunity" target="_blank" rel="noopener noreferrer" style={{color: '#c5a26b'}}>
            https://www.patreon.com/c/TheOldWorldCommunity
          </a>
        </p>
      </footer>
    </div>
  );
};

export default App;
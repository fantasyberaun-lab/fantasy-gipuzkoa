import type { Ancho } from "../../definir";

// Selector de avatar de perfil (pestaña Niveles) y mini descripción de cada icono
// al ampliarlo. Los iconos se desbloquean por nivel (ver lib/niveles.ts y 0086).

const es = {
  titulo: "Icono de perfil",
  ayuda: "Toca un icono para elegirlo. Los bloqueados se desbloquean al subir de nivel.",
  sinAvatar: "Sin icono",
  guardado: "Icono actualizado.",
  piezas: { peon: "Peón", caballo: "Caballo", alfil: "Alfil", torre: "Torre", dama: "Dama", rey: "Rey" },
  descripciones: {
    "peon": "Todo gran jugador empezó moviendo uno. Es la pieza más humilde y la única que puede transformarse al llegar al final.",
    "caballo": "La única pieza que salta por encima de las demás. Imprevisible y difícil de calcular.",
    "alfil": "Se mueve en diagonal y nunca pisa una casilla del otro color. Un duelo de alfiles es pura geometría.",
    "torre": "Dominar las columnas abiertas gana partidas. Dos torres en séptima fila son difíciles de parar.",
    "dama": "La pieza más poderosa del tablero: combina la torre y el alfil en una sola.",
    "rey": "Todo gira en torno a protegerlo. En el final de la partida se convierte en una pieza de ataque.",
    "gukesh": "18º campeón del mundo (2024). Con 18 años es el más joven de la historia en conseguir el título.",
    "smyslov": "7º campeón del mundo (1957-58). Aficionado a la ópera, jugaba con una armonía y una claridad muy suyas.",
    "ding": "17º campeón del mundo (2023-24). Primer chino en conseguir el título, tras una final decidida en el desempate.",
    "euwe": "5º campeón del mundo (1935-37). Matemático neerlandés, derrotó a Alekhine y más tarde presidió la FIDE.",
    "ruy-lopez": "Sacerdote español del siglo XVI y autor de uno de los primeros grandes libros de ajedrez (1561). Da nombre a la apertura Ruy López.",
    "petrosian": "9º campeón del mundo (1963-69). Apodado «el Tigre de Hierro», hizo de la defensa un arte.",
    "kramnik": "14º campeón del mundo (2000-07). Destronó a Kasparov en 2000 con un uso magistral de la defensa Berlinesa.",
    "steinitz": "1er campeón del mundo oficial (1886-94). Padre del juego posicional: demostró que se gana acumulando pequeñas ventajas.",
    "anand": "15º campeón del mundo (2007-13). Llamado «el Tigre de Madrás», es famoso por su velocidad de cálculo.",
    "tal": "8º campeón del mundo (1960-61), conocido como el Mago de Riga. Sus sacrificios imposibles desconcertaban a los rivales.",
    "morphy": "Genio de Nueva Orleans y campeón no oficial del mundo. Con 21 años derrotó a los mejores de Europa (1858).",
    "spassky": "10º campeón del mundo (1969-72). Jugador universal que perdió el título contra Fischer en Reikiavik.",
    "alekhine": "4º campeón del mundo (1927-35 y 1937-46). Maestro del ataque y la combinación, murió siendo campeón.",
    "karpov": "12º campeón del mundo (1975-85). Estrangulador posicional: sus victorias parecían inevitables.",
    "lasker": "2º campeón del mundo (1894-1921). Reinó 27 años, el mandato más largo, y fue también matemático y filósofo.",
    "botvinnik": "6º campeón del mundo y patriarca de la escuela soviética. Preparaba cada partida con método científico.",
    "capablanca": "3er campeón del mundo (1921-27). El genio cubano, apodado «la máquina del ajedrez» por su juego casi sin errores.",
    "fischer": "11º campeón del mundo (1972-75). Su duelo contra Spassky en Reikiavik paralizó al mundo durante un verano.",
    "kasparov": "13º campeón del mundo (1985-2000). Dominó el ajedrez durante dos décadas con un juego dinámico y feroz.",
    "carlsen": "16º campeón del mundo (2013-23). El noruego alcanzó el mayor Elo de la historia y dominó una década.",
  },
};

// Forma de la sección: euskera e inglés tienen que tener exactamente estas claves.
export type Seccion = Ancho<typeof es>;

export default es;

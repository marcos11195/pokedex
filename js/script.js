const pokedex = document.getElementById("pokedex");
const paginadorTop = document.getElementById("paginador-top");
const paginadorBottom = document.getElementById("paginador-bottom");
const filtroTipo = document.getElementById("tipo");
const buscador = document.getElementById("buscador");
const detalle = document.getElementById("detalle");

const porPagina = 20;
let paginaActual = 1;
let listaCompleta = [];
let listaFiltrada = [];

// Mapeo de generación a región
const generacionRegion = {
    "generation-i": "Kanto",
    "generation-ii": "Johto",
    "generation-iii": "Hoenn",
    "generation-iv": "Sinnoh",
    "generation-v": "Unova",
    "generation-vi": "Kalos",
    "generation-vii": "Alola",
    "generation-viii": "Galar",
    "generation-ix": "Paldea"
};

// Función auxiliar para obtener traducción
function traducirNombre(array, idioma = "es") {
    if (!Array.isArray(array)) return "";
    const traduccion = array.find(n => n.language?.name === idioma);
    return traduccion ? traduccion.name : array[0]?.name || "";
}

// Función auxiliar para traducir estadísticas
async function traducirStat(statUrl) {
    const resp = await fetch(statUrl);
    const statData = await resp.json();
    return traducirNombre(statData.names, "es");
}
async function generarListaPorTipo(tipo) {
    if (!tipo) {
        const resp = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025");
        const data = await resp.json();
        listaCompleta = data.results.map(p => {
            const id = parseInt(p.url.split("/").slice(-2, -1)[0], 10);
            return { name: p.name, url: p.url, id };
        });
    } else {
        const resp = await fetch(`https://pokeapi.co/api/v2/type/${tipo}`);
        const data = await resp.json();
        listaCompleta = data.pokemon.map(p => {
            const id = parseInt(p.pokemon.url.split("/").slice(-2, -1)[0], 10);
            return { name: p.pokemon.name, url: p.pokemon.url, id };
        });
    }

    listaCompleta.sort((a, b) => a.id - b.id);
    listaFiltrada = [...listaCompleta];
}
async function mostrarPokemon(data) {
    const card = document.createElement("div");
    card.className = "pokemon";

    const tipoPrincipal = data.types[0]?.type?.name || "normal";
    card.classList.add(`bg-${tipoPrincipal}`);

    const sprites = [
        data.sprites.front_default,
        data.sprites.back_default,
        data.sprites.front_shiny,
        data.sprites.back_shiny,
        data.sprites.other?.["official-artwork"]?.front_default
    ].filter(Boolean);

    const img = document.createElement("img");
    img.src = sprites[0] || "img/pokeball.png";
    card.appendChild(img);

    const alturaMetros = (data.height ?? 0) / 10;
    const pesoKg = (data.weight ?? 0) / 10;

    // Tipos traducidos con clase en inglés (para color)
    const tiposHTML = await Promise.all(
        data.types.map(async t => {
            const respType = await fetch(t.type.url);
            const typeData = await respType.json();
            const nombreEsp = traducirNombre(typeData.names, "es");
            return `<span class="tipo ${t.type.name}">${nombreEsp}</span>`;
        })
    );

    const info = document.createElement("div");
    info.innerHTML = `
    <h3>#${data.id} ${data.name.toUpperCase()}</h3>
    <p>Altura: ${alturaMetros} m</p>
    <p>Peso: ${pesoKg} kg</p>
    <p>Tipo: ${tiposHTML.join(" ")}</p>
  `;
    card.appendChild(info);

    // Hover para sprites
    let intervalId = null;
    let index = 0;
    card.addEventListener("mouseenter", () => {
        if (sprites.length > 1 && !intervalId) {
            intervalId = setInterval(() => {
                index = (index + 1) % sprites.length;
                img.src = sprites[index];
            }, 1000);
        }
    });
    card.addEventListener("mouseleave", () => {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        img.src = sprites[0] || "img/pokeball.png";
        index = 0;
    });

    // Clic para detalle
    card.addEventListener("click", async () => {
        const respSpecies = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${data.id}`);
        const speciesData = await respSpecies.json();

        const nombreEsp = traducirNombre(speciesData.names, "es") || data.name;
        const flavorEspRaw = speciesData.flavor_text_entries.find(f => f.language?.name === "es")?.flavor_text || "";
        const flavorEsp = flavorEspRaw.replace(/\f/g, " ").replace(/\n/g, " ").trim();
        const generacion = speciesData.generation?.name;
        const region = generacionRegion[generacion] || "Desconocida";

        const movimientos = await Promise.all(
            data.moves.slice(0, 8).map(async m => {
                const respMove = await fetch(m.move.url);
                const moveData = await respMove.json();
                return traducirNombre(moveData.names, "es");
            })
        );

        // Estadísticas traducidas
        const statsTraducidas = await Promise.all(
            data.stats.map(async s => {
                const nombreEsp = await traducirStat(s.stat.url);
                return `<tr><td>${nombreEsp}</td><td>${s.base_stat}</td></tr>`;
            })
        );

        const statsTable = `
      <table class="stats-table">
        <thead><tr><th>Estadística</th><th>Valor</th></tr></thead>
        <tbody>${statsTraducidas.join("")}</tbody>
      </table>
    `;

        detalle.style.display = "block";
        detalle.innerHTML = `
      <h2>${nombreEsp}</h2>
      <img src="${sprites[0] || "img/pokeball.png"}" alt="${nombreEsp}">
      <p><strong>Descripción:</strong> ${flavorEsp}</p>
      <p><strong>Región:</strong> ${region}</p>
      <p><strong>Tipos:</strong> ${tiposHTML.join(" ")}</p>
      <p><strong>Movimientos:</strong> ${movimientos.join(", ")}</p>
      ${statsTable}
      <button id="cerrar-detalle">Cerrar</button>
    `;

        document.getElementById("cerrar-detalle").addEventListener("click", () => {
            detalle.style.display = "none";
            detalle.innerHTML = "";
        });
    });

    pokedex.appendChild(card);
}
async function cargarPagina(numPagina) {
    pokedex.innerHTML = "";

    const total = listaFiltrada.length;
    const inicio = (numPagina - 1) * porPagina;
    const fin = Math.min(numPagina * porPagina, total);
    const slice = listaFiltrada.slice(inicio, fin);

    const resultados = await Promise.all(
        slice.map(item => fetch(item.url).then(r => r.json()))
    );

    for (const dato of resultados) {
        await mostrarPokemon(dato);
    }

    paginaActual = numPagina;
    actualizarPaginador();
}

function actualizarPaginador() {
    paginadorTop.innerHTML = "";
    paginadorBottom.innerHTML = "";

    const totalPaginas = Math.ceil(listaFiltrada.length / porPagina) || 1;

    function crearBotones(container) {
        const prev = document.createElement("button");
        prev.textContent = "«";
        prev.className = "page-btn";
        prev.disabled = paginaActual === 1;
        prev.onclick = () => cargarPagina(paginaActual - 1);
        container.appendChild(prev);

        const rango = 5;
        const inicio = Math.max(1, paginaActual - rango);
        const fin = Math.min(totalPaginas, paginaActual + rango);

        for (let i = inicio; i <= fin; i++) {
            const btn = document.createElement("button");
            btn.textContent = i;
            btn.className = "page-btn" + (i === paginaActual ? " active" : "");
            btn.onclick = () => cargarPagina(i);
            container.appendChild(btn);
        }

        const next = document.createElement("button");
        next.textContent = "»";
        next.className = "page-btn";
        next.disabled = paginaActual === totalPaginas;
        next.onclick = () => cargarPagina(paginaActual + 1);
        container.appendChild(next);
    }

    crearBotones(paginadorTop);
    crearBotones(paginadorBottom);
}

// Eventos
filtroTipo.addEventListener("change", async () => {
    await generarListaPorTipo(filtroTipo.value);
    buscador.value = "";
    cargarPagina(1);
});

buscador.addEventListener("input", () => {
    const texto = buscador.value.toLowerCase().trim();
    if (!texto) {
        listaFiltrada = [...listaCompleta];
    } else {
        listaFiltrada = listaCompleta.filter(p => p.name.toLowerCase().includes(texto));
    }
    cargarPagina(1);
});

// Primera carga
(async () => {
    await generarListaPorTipo("");
    cargarPagina(1);
})();

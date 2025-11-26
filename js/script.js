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

// Obtener lista de Pokémon por tipo
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

// Mostrar tarjeta de Pokémon
function mostrarPokemon(data) {
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

    const tiposHTML = data.types
        .map(t => `<span class="tipo ${t.type.name}">${t.type.name.toUpperCase()}</span>`)
        .join(" ");

    const alturaMetros = (data.height ?? 0) / 10;
    const pesoKg = (data.weight ?? 0) / 10;

    const info = document.createElement("div");
    info.innerHTML = `
    <h3>#${data.id} ${data.name.toUpperCase()}</h3>
    <p>Altura: ${alturaMetros} m</p>
    <p>Peso: ${pesoKg} kg</p>
    <p>Tipo: ${tiposHTML}</p>
  `;
    card.appendChild(info);

    // Ciclo de sprites solo en hover
    let intervalId = null;
    let index = 0;
    card.addEventListener("mouseenter", () => {
        if (sprites.length > 1 && !intervalId) {
            intervalId = setInterval(() => {
                index = (index + 1) % sprites.length;
                img.src = sprites[index];
            }, 1000);
            card.style.cursor = "pointer";
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

    // Evento de clic para mostrar detalle
    card.addEventListener("click", async () => {
        // Obtener especie para saber la generación
        const respSpecies = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${data.id}`);
        const speciesData = await respSpecies.json();
        const generacion = speciesData.generation?.name;
        const region = generacionRegion[generacion] || "Desconocida";

        // Construir tabla de estadísticas
        const statsTable = `
      <table class="stats-table">
        <thead>
          <tr>
            <th>Stat</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          ${data.stats.map(s => `
            <tr>
              <td>${s.stat.name.toUpperCase()}</td>
              <td>${s.base_stat}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

        detalle.style.display = "block";
        detalle.innerHTML = `
      <h2>Pokémon seleccionado</h2>
      <img src="${sprites[0] || "img/pokeball.png"}" alt="${data.name}">
      <h3>#${data.id} ${data.name.toUpperCase()}</h3>
      <p><strong>Altura:</strong> ${alturaMetros} m</p>
      <p><strong>Peso:</strong> ${pesoKg} kg</p>
      <p><strong>Tipos:</strong> ${tiposHTML}</p>
      <p><strong>Región:</strong> ${region}</p>
      <p><strong>Habilidades:</strong> ${data.abilities.map(a => a.ability.name).join(", ")}</p>
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

// Cargar una página
async function cargarPagina(numPagina) {
    pokedex.innerHTML = "";

    const total = listaFiltrada.length;
    const inicio = (numPagina - 1) * porPagina;
    const fin = Math.min(numPagina * porPagina, total);
    const slice = listaFiltrada.slice(inicio, fin);

    const resultados = await Promise.all(
        slice.map(item => fetch(item.url).then(r => r.json()))
    );

    resultados.forEach(mostrarPokemon);

    paginaActual = numPagina;
    actualizarPaginador();
}

// Paginador arriba y abajo
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
        listaFiltrada = listaCompleta.filter(p => p.name.includes(texto));
    }
    cargarPagina(1);
});

// Primera carga
(async () => {
    await generarListaPorTipo("");
    cargarPagina(1);
})();

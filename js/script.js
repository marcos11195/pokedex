const pokedex = document.getElementById("pokedex");
const paginador = document.getElementById("paginador");

const totalPokemon = 1025;   // número total actual en PokéAPI
const porPagina = 20;        // cuantos por página
const totalPaginas = Math.ceil(totalPokemon / porPagina);

let paginaActual = 1;

async function cargarPokemon(id) {
    const resp = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    const data = await resp.json();

    const div = document.createElement("div");
    div.className = "pokemon";
    div.innerHTML = `
    <h3>${data.name.toUpperCase()}</h3>
    <img src="${data.sprites.front_default}" alt="${data.name}">
    <p>Altura: ${data.height}</p>
    <p>Peso: ${data.weight}</p>
    <p>Tipo: ${data.types.map(t => t.type.name).join(", ")}</p>
  `;

    pokedex.appendChild(div);
}

async function cargarPagina(numPagina) {
    pokedex.innerHTML = ""; // limpiar
    const inicio = (numPagina - 1) * porPagina + 1;
    const fin = Math.min(numPagina * porPagina, totalPokemon);

    for (let i = inicio; i <= fin; i++) {
        await cargarPokemon(i);
    }

    paginaActual = numPagina;
    actualizarPaginador();
}

function actualizarPaginador() {
    paginador.innerHTML = "";

    // Botón anterior
    const prev = document.createElement("button");
    prev.textContent = "«";
    prev.className = "page-btn";
    prev.disabled = paginaActual === 1;
    prev.onclick = () => cargarPagina(paginaActual - 1);
    paginador.appendChild(prev);

    // Botones numéricos (ejemplo: mostrar 10 alrededor)
    const rango = 5;
    let inicio = Math.max(1, paginaActual - rango);
    let fin = Math.min(totalPaginas, paginaActual + rango);

    for (let i = inicio; i <= fin; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.className = "page-btn" + (i === paginaActual ? " active" : "");
        btn.onclick = () => cargarPagina(i);
        paginador.appendChild(btn);
    }

    // Botón siguiente
    const next = document.createElement("button");
    next.textContent = "»";
    next.className = "page-btn";
    next.disabled = paginaActual === totalPaginas;
    next.onclick = () => cargarPagina(paginaActual + 1);
    paginador.appendChild(next);
}

// primera carga
cargarPagina(1);

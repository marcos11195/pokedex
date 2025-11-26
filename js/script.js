const pokedex = document.getElementById("pokedex");
const paginador = document.getElementById("paginador");
const filtroTipo = document.getElementById("tipo");

const porPagina = 20;
let paginaActual = 1;
let listaFiltrada = []; // aquí guardamos los Pokémon filtrados

// Función para obtener el mejor sprite disponible
function obtenerSprite(data) {
    return (
        data.sprites.front_default ||
        (data.sprites.other["official-artwork"] &&
            data.sprites.other["official-artwork"].front_default) ||
        (data.sprites.other["home"] &&
            data.sprites.other["home"].front_default) ||
        (data.sprites.other["showdown"] &&
            data.sprites.other["showdown"].front_default) ||
        "img/pokeball.png" // fallback genérico (añade tu propia imagen local)
    );
}

// Función para mostrar un Pokémon en tarjeta
function mostrarPokemon(data) {
    const div = document.createElement("div");
    div.className = "pokemon";

    // Lista de sprites disponibles (filtramos los que no sean null)
    const sprites = [
        data.sprites.front_default,
        data.sprites.back_default,
        data.sprites.front_shiny,
        data.sprites.back_shiny,
        data.sprites.other["official-artwork"]?.front_default,
        data.sprites.other["home"]?.front_default,
        // data.sprites.other["showdown"]?.front_default
    ].filter(url => url);

    const img = document.createElement("img");
    img.src = sprites[0] || "img/pokeball.png"; // fallback si no hay ninguno
    div.appendChild(img);

    const info = document.createElement("div");
    info.innerHTML = `
    <h3>${data.name.toUpperCase()}</h3>
    <p>Altura: ${data.height}</p>
    <p>Peso: ${data.weight}</p>
    <p>Tipo: ${data.types.map(t => t.type.name).join(", ")}</p>
  `;
    div.appendChild(info);

    // Ciclar sprites cada 1 segundo (solo si hay más de uno)
    if (sprites.length > 1) {
        let index = 0;
        setInterval(() => {
            index = (index + 1) % sprites.length;
            img.src = sprites[index];
        }, 1000);
    }

    pokedex.appendChild(div);
}

// Cargar una página de la lista filtrada
async function cargarPagina(numPagina) {
    pokedex.innerHTML = "";
    const inicio = (numPagina - 1) * porPagina;
    const fin = Math.min(numPagina * porPagina, listaFiltrada.length);

    const promesas = [];
    for (let i = inicio; i < fin; i++) {
        const url = listaFiltrada[i].pokemon.url;
        promesas.push(fetch(url).then(resp => resp.json()));
    }

    const resultados = await Promise.all(promesas);
    resultados.forEach(data => mostrarPokemon(data));

    paginaActual = numPagina;
    actualizarPaginador();
}

// Actualizar el paginador
function actualizarPaginador() {
    paginador.innerHTML = "";
    const totalPaginas = Math.ceil(listaFiltrada.length / porPagina);

    const prev = document.createElement("button");
    prev.textContent = "«";
    prev.className = "page-btn";
    prev.disabled = paginaActual === 1;
    prev.onclick = () => cargarPagina(paginaActual - 1);
    paginador.appendChild(prev);

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

    const next = document.createElement("button");
    next.textContent = "»";
    next.className = "page-btn";
    next.disabled = paginaActual === totalPaginas;
    next.onclick = () => cargarPagina(paginaActual + 1);
    paginador.appendChild(next);
}

// Generar lista filtrada desde la API de tipos
async function generarListaFiltrada(tipo) {
    if (!tipo) {
        // Si no hay filtro, cargamos todos los Pokémon
        const resp = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025");
        const data = await resp.json();
        listaFiltrada = data.results.map(p => ({ pokemon: p }));
    } else {
        const resp = await fetch(`https://pokeapi.co/api/v2/type/${tipo}`);
        const data = await resp.json();
        listaFiltrada = data.pokemon; // array con {pokemon: {name, url}}
    }
}

// Evento para cambiar filtro
filtroTipo.addEventListener("change", async () => {
    const tipoSeleccionado = filtroTipo.value;
    await generarListaFiltrada(tipoSeleccionado);
    cargarPagina(1);
});

// Primera carga (todos los Pokémon)
(async () => {
    await generarListaFiltrada("");
    cargarPagina(1);
})();

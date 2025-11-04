const API_COINGECKO_URL = 'https://api.coingecko.com/api/v3';
const MOEDA_FIAT = 'brl'; //aqui mostra o estilo da moeda que vc escolher
const TOTAL_MOEDAS = 10;

const listaMoedasEl = document.getElementById('lista-moedas');
const listaFavoritosEl = document.getElementById('lista-favoritos');
const modalGrafico = document.getElementById('modal-grafico');
const fecharModalBtn = document.getElementById('fechar-modal');
const tituloGraficoEl = document.getElementById('titulo-grafico');
const graficoCanvas = document.getElementById('grafico-historico');

let favoritos = JSON.parse(localStorage.getItem('criptoFavoritos')) || [];
let graficoAtual = null;
let periodoAtual = '7'; // mostra o padrão aqui que escolhe
let moedaAtual = null;

async function carregarMoedasTop() {
  try {
    const resposta = await fetch(
      `${API_COINGECKO_URL}/coins/markets?vs_currency=${MOEDA_FIAT}&order=market_cap_desc&per_page=${TOTAL_MOEDAS}&page=1&sparkline=false`
    );
    const dados = await resposta.json();

    renderizarListaMoedas(dados);
    renderizarListaFavoritos(dados);

    // Encontra moeda com maior alta
    const maiorAlta = dados.reduce((max, moeda) =>
      moeda.price_change_percentage_24h > max.price_change_percentage_24h ? moeda : max
    );

    // Destaca a moeda
    setTimeout(() => {
      document.querySelectorAll('.coin').forEach(el => {
        const nomeCoin = el.querySelector('span').textContent.toLowerCase();
        if (nomeCoin.includes(maiorAlta.name.toLowerCase())) {
          el.classList.add('moeda-destaque');
        }
      });
    }, 100);
  } catch (erro) {
    console.error('Erro ao carregar moedas:', erro);
  }
}

function renderizarListaMoedas(moedas) {
  listaMoedasEl.innerHTML = moedas.map(coin => `
    <div class="coin" onclick="mostrarGraficoMoeda('${coin.id}', '${coin.name}')">
      <img src="${coin.image}" alt="${coin.name}" width="32" height="32">
      <span>${coin.name} (${coin.symbol.toUpperCase()})</span>
      <span>R$ ${coin.current_price.toLocaleString('pt-BR')}</span>
      <button 
        class="fav-btn"
        onclick="event.stopPropagation(); alternarFavorito('${coin.id}')">
        <img src="assets/${favoritos.includes(coin.id) ? 'hollywood-star (2).png' : 'hollywood-star (1).png'}" alt="Favorito">
      </button>
    </div>
  `).join('');
}

function renderizarListaFavoritos(moedas) {
  const moedasFav = moedas.filter(c => favoritos.includes(c.id));
  if (moedasFav.length === 0) {
    listaFavoritosEl.innerHTML = `<p>Nenhuma moeda favoritada ainda.</p>`;
    return;
  }
  listaFavoritosEl.innerHTML = moedasFav.map(coin => `
    <div class="coin" onclick="mostrarGraficoMoeda('${coin.id}', '${coin.name}')">
      <img src="${coin.image}" alt="${coin.name}" width="32" height="32">
      <span>${coin.name} (${coin.symbol.toUpperCase()})</span>
      <span>R$ ${coin.current_price.toLocaleString('pt-BR')}</span>
      <button class="fav-btn" onclick="event.stopPropagation(); alternarFavorito('${coin.id}')">
        <img src="assets/hollywood-star (2).png" alt="Favorito">
      </button>
    </div>
  `).join('');
}

function alternarFavorito(idMoeda) {
  if (favoritos.includes(idMoeda)) {
    favoritos = favoritos.filter(id => id !== idMoeda);
  } else {
    favoritos.push(idMoeda);
  }
  localStorage.setItem('criptoFavoritos', JSON.stringify(favoritos));
  carregarMoedasTop();
}

async function mostrarGraficoMoeda(idMoeda, nomeMoeda) {
  moedaAtual = idMoeda;
  tituloGraficoEl.textContent = `Histórico de ${nomeMoeda}`;
  modalGrafico.style.display = 'flex';
  atualizarGrafico(periodoAtual);
}
// atualiza o grafico apagando o ultimo e colocando um novo
async function atualizarGrafico(periodo) {
  try {
    const resposta = await fetch(`${API_COINGECKO_URL}/coins/${moedaAtual}/market_chart?vs_currency=${MOEDA_FIAT}&days=${periodo}`);
    const dados = await resposta.json();

    const precos = dados.prices.map(p => ({
      tempo: new Date(p[0]),
      valor: p[1],
    }));

    const rotulos = precos.map(p => p.tempo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    const valores = precos.map(p => p.valor);

    if (graficoAtual) graficoAtual.destroy();

    graficoAtual = new Chart(graficoCanvas, {
      type: 'line',
      data: {
        labels: rotulos,
        datasets: [{
          label: `Preço (R$) - Últimos ${periodo === 'max' ? 'dias' : periodo}`,
          data: valores,
          borderColor: '#00ff88',
          backgroundColor: 'rgba(0, 255, 136, 0.15)',
          borderWidth: 2,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#ffffff',
          tension: 0.25
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#fff' } } },
        scales: {
          x: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });

    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('ativo'));
    document.querySelector(`.period-btn[data-days="${periodo}"]`).classList.add('ativo');
  } catch (erro) {
    console.error('Erro ao atualizar gráfico:', erro);
  }
}

// para fechar o modal
fecharModalBtn.addEventListener('click', () => {
  modalGrafico.style.display = 'none';
});
// aqui fecha quando clicar fora
window.addEventListener('click', (e) => {
  if (e.target === modalGrafico) modalGrafico.style.display = 'none';
});

// Botões de período de dias
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      periodoAtual = btn.getAttribute('data-days');
      atualizarGrafico(periodoAtual);
    });
  });
});
// faz ficar atualizando a pg
carregarMoedasTop();
setInterval(carregarMoedasTop, 60000);

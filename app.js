const qs = sel => document.querySelector(sel);
const qsa = sel => Array.from(document.querySelectorAll(sel));

function showView(viewSelector){
  qsa('main section').forEach(sec => sec.classList.add('hidden'));
  const el = qs(viewSelector);
  if (el) el.classList.remove('hidden');

  qsa('header nav button').forEach(b => b.classList.remove('active'));
  const activeBtn = qs(`header nav button[data-target="${viewSelector}"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

function openModal(editData = null){
  const modal = qs('#modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  if (editData) fillModalForm(editData);
}

function closeModal(){
  const modal = qs('#modal');
  if (!modal) return;
  modal.classList.add('hidden');
  const form = qs('#form-receita');
  if (form) form.reset();
  editingLocalId = null;
}

function initNav() {
  qsa('header nav button').forEach(btn => {
    const target = btn.dataset.target;
    btn.addEventListener('click', () => showView(target));
  });

  const btnNova = qs('#btn-nova-receita');
  if (btnNova) {
    btnNova.addEventListener('click', () => {
      qs('#modal-titulo').textContent = 'Nova Receita';
      openModal(null);
    });
  }

  const btnFechar = qs('#fechar-modal');
  if (btnFechar) btnFechar.addEventListener('click', closeModal);

  const modal = qs('#modal');
  if (modal) modal.addEventListener('click', (e) => {
    if (e.target === modal) { closeModal(); }
  });

  showView('#sec-buscar');
}

async function fetchMealsByName(name) {
  const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(name)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro na API: ' + res.status);
  return res.json();
}

async function fetchMealsByIngredient(ingredient) {
  const url = `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro na API: ' + res.status);
  return res.json();
}

async function fetchMealById(idMeal) {
  const url = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(idMeal)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro na API: ' + res.status);
  const data = await res.json();
  return data.meals ? data.meals[0] : null;
}

function createMealCard(meal) {
  const title = meal.strMeal || meal.title || '';
  const thumb = meal.strMealThumb || meal.image_url || '';
  const id = meal.idMeal || meal.id || '';
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = `
    <img src="${thumb}" alt="${escapeHtml(title)}">
    <div class="card-body">
      <h3>${escapeHtml(title)}</h3>
      <div class="card-actions">
        <button class="btn primary btn-detail" data-id="${id}">Detalhes</button>
        <button class="btn ghost btn-fav" data-id="${id}">Favoritar</button>
      </div>
    </div>
  `;
  return div;
}

function escapeHtml(str = ''){ return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }

async function handleSearchClick(evt){
  if (evt && evt.preventDefault) evt.preventDefault();

  const q = qs('#input-nome').value.trim();
  const resultsEl = qs('#resultados');
  if (!resultsEl) return;
  resultsEl.innerHTML = '🔍 Buscando...';

  try {
    if (!q) {
      resultsEl.innerHTML = '<div style="padding: 20px; text-align: center; border: 1px dashed #646363ff; border-radius: 14px; color: #646363ff;">Digite alguma refeição para realizar a busca.</div>';
      return;
    }

    if (q.toLowerCase().startsWith('i:')) {
      const ingredient = q.slice(2).trim();
      const data = await fetchMealsByIngredient(ingredient);
      const meals = data.meals || [];
      resultsEl.innerHTML = '';
      if (meals.length === 0) {
        resultsEl.innerHTML = `<div style="padding: 20px; text-align: center; border: 1px dashed #646363ff; border-radius: 14px; color: #646363ff;">Nenhuma receita com o ingrediente.<b>${escapeHtml(ingredient)}</b> encontrada.</div>`;
        return;
      }
      meals.forEach(m => resultsEl.appendChild(createMealCard(m)));
      return;
    }

    const data = await fetchMealsByName(q);
    const meals = data.meals || [];
    resultsEl.innerHTML = '';
    if (meals.length === 0) {
      resultsEl.innerHTML = `<div style="padding: 20px; text-align: center; border: 1px dashed #646363ff; border-radius: 14px; color: #646363ff;">Nenhuma receita com o nome <b>${escapeHtml(q)}</b> encontrada.</div>`;
      return;
    }
    meals.forEach(m => resultsEl.appendChild(createMealCard(m)));
  } catch (err) {
    console.error('Erro na busca:', err);
    resultsEl.innerHTML = `<p>Erro ao buscar receitas: ${escapeHtml(err.message)}</p>`;
  }
}

const LS_FAV_KEY = 'favorites_recipes';
function getFavorites(){ const raw = localStorage.getItem(LS_FAV_KEY); return raw ? JSON.parse(raw) : []; }
function saveFavorites(list){ localStorage.setItem(LS_FAV_KEY, JSON.stringify(list)); }
function addFavorite(meal){ const favs = getFavorites(); if (!favs.some(f => f.idMeal === meal.idMeal)){ favs.push(meal); saveFavorites(favs); } }
function removeFavorite(idMeal){ let favs = getFavorites(); favs = favs.filter(f => f.idMeal !== idMeal); saveFavorites(favs); }

function renderFavoritesList(){
  const container = qs('#lista-favoritos');
  if (!container) return;
  const favs = getFavorites();
  container.innerHTML = '';
  if (favs.length === 0) { container.innerHTML = '<div style="padding: 20px; text-align: center; border: 1px dashed #646363ff; border-radius: 14px; color: #646363ff;">Nenhuma receita favoritada.</div>'; return; }
  favs.forEach(m => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${m.strMealThumb || ''}" alt="${escapeHtml(m.strMeal || m.title)}">
      <div class="card-body">
        <h3>${escapeHtml(m.strMeal || m.title)}</h3>
        <div class="card-actions">
          <button class="btn primary btn-detail" data-id="${m.idMeal}">Detalhes</button>
          <button class="btn ghost btn-unfav" data-id="${m.idMeal}">Remover</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

const LS_LOCAL_KEY = 'local_recipes';
let editingLocalId = null;
function getLocalRecipes(){ const raw = localStorage.getItem(LS_LOCAL_KEY); return raw ? JSON.parse(raw) : []; }
function saveLocalRecipes(list){ localStorage.setItem(LS_LOCAL_KEY, JSON.stringify(list)); }

function createLocalRecipe(data){
  const list = getLocalRecipes();
  const id = Date.now().toString();
  const item = { id, ...data };
  list.unshift(item);
  saveLocalRecipes(list);
  return item;
}
function updateLocalRecipe(id, data){
  const list = getLocalRecipes().map(r => r.id === id ? { ...r, ...data } : r);
  saveLocalRecipes(list);
}
function deleteLocalRecipe(id){
  const list = getLocalRecipes().filter(r => r.id !== id);
  saveLocalRecipes(list);
}

function renderLocalList(){
  const container = qs('#lista-minhas-receitas');
  if (!container) return;
  const list = getLocalRecipes();
  container.innerHTML = '';
  if (list.length === 0){ container.innerHTML = '<div style="padding: 20px; text-align: center; border: 1px dashed #000000ff; border-radius: 14px;">Sem receitas locais. Crie uma!</div>'; return; }
  list.forEach(r => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-body">
        <h3>${escapeHtml(r.title)}</h3>
        <div class="card-actions">
          <button class="btn primary btn-detail-local" data-id="${r.id}">Detalhes</button>
          <button class="btn ghost btn-edit-local" data-id="${r.id}">Editar</button>
          <button class="btn ghost btn-delete-local" data-id="${r.id}">Excluir</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function fillModalForm(recipe){
  const form = qs('#form-receita');
  if (!form) return;
  form.titulo.value = recipe.title || '';
  form.ingredientes.value = (recipe.ingredients || []).join('\n');
  form.instrucoes.value = recipe.instructions || '';
  qs('#modal-titulo').textContent = 'Editar Receita';
  editingLocalId = recipe.id;
}

const formEl = document.getElementById('form-receita');
if (formEl) {
  formEl.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      title: form.titulo.value.trim(),
      ingredients: form.ingredientes.value.split('\n').map(s => s.trim()).filter(Boolean),
      instructions: form.instrucoes.value.trim(),
      image_url: ''
    };
    if (editingLocalId){
      updateLocalRecipe(editingLocalId, data);
      alert('Receita atualizada!');
    } else{
      createLocalRecipe(data);
      alert('Receita criada!');
    }
    closeModal();
    renderLocalList();
  });
}

document.addEventListener('click', async (e) => {
  const t = e.target;

  if (t.matches('.btn-detail')){
    const id = t.dataset.id;
    try{
      const meal = await fetchMealById(id);
      if (!meal) { alert('Detalhes não encontrados'); return; }
      showMealDetailInView(meal);
    } catch(err){ console.error(err); alert('Erro ao buscar detalhes'); }
    return;
  }

  if (t.matches('.btn-fav')){
    const id = t.dataset.id;
    try{
      const meal = await fetchMealById(id);
      if (!meal) { alert('Não encontrado'); return; }
      addFavorite({ idMeal: meal.idMeal, strMeal: meal.strMeal, strMealThumb: meal.strMealThumb });
      alert('Receita Favoritada!');
    } catch(e){ console.error(e); alert('Erro ao favoritar'); }
    return;
  }

  if (t.matches('.btn-unfav')){
    const id = t.dataset.id;
    removeFavorite(id);
    renderFavoritesList();
    return;
  }

  if (t.matches('.btn-edit-local')){
    const id = t.dataset.id;
    const recipe = getLocalRecipes().find(r => r.id === id);
    if (!recipe) return alert('Receita local não encontrada');
    fillModalForm(recipe);
    openModal(recipe);
    return;
  }
  if (t.matches('.btn-delete-local')){
    const id = t.dataset.id;
    if (!confirm('Excluir Receita?')) return;
    deleteLocalRecipe(id);
    renderLocalList();
    return;
  }
  if (t.matches('.btn-detail-local')){
    const id = t.dataset.id;
    const recipe = getLocalRecipes().find(r => r.id === id);
    if (!recipe) return alert('Receita não encontrada');
    showLocalDetailInView(recipe);
    return;
  }
});

function showMealDetailInView(meal){
  showView('#sec-buscar');
  const el = qs('#resultados');
  if (!el) return;

  el.innerHTML = `
    <div id="detail-container">
      <button id="btn-voltar-busca" class="btn-voltar">← Voltar</button>
      <h2>${escapeHtml(meal.strMeal)}</h2>
      <img src="${meal.strMealThumb}" alt="${escapeHtml(meal.strMeal)}" style="max-width:420px;width:100%">
      <h3>Ingredientes</h3>
      <ul>
        ${[...Array(20)].map((_,i) => {
          const ing = meal['strIngredient' + (i+1)];
          const qty = meal['strMeasure' + (i+1)] || '';
          return ing && ing.trim() ? `<li>${escapeHtml((qty + ' ' + ing).trim())}</li>` : '';
        }).join('')}
      </ul>
      <h3>Modo de preparo</h3>
      <p>${escapeHtml(meal.strInstructions || '')}</p>
    </div>
  `;

  const btnVoltar = qs('#btn-voltar-busca');
  if (btnVoltar) {
    btnVoltar.addEventListener('click', () => {
      handleSearchClick();
    });
  }
}

function showLocalDetailInView(recipe) {
  showView('#sec-minhas-receitas');

  const el = qs('#lista-minhas-receitas');
  if (!el) {
    console.error("Container #lista-minhas não encontrado!");
    return;
  }

  if (!recipe || !recipe.title) {
    el.innerHTML = '<p style="color:red;">Erro ao exibir detalhes da receita.</p>';
    return;
  }

  el.innerHTML = `
    <div id="detail-container">
      <button id="btn-voltar-minhas-receitas" class="btn-voltar">← Voltar</button>
      <h2>${escapeHtml(recipe.title)}</h2>

      <h3>Ingredientes</h3>
      <ul>
        ${(recipe.ingredients || [])
          .map(i => `<li>${escapeHtml(i)}</li>`)
          .join('')}
      </ul>

      <h3>Modo de preparo</h3>
      <p>${escapeHtml(recipe.instructions || 'Sem instruções disponíveis.')}</p>
    </div>
  `;

  const btnVoltar = qs('#btn-voltar-minhas-receitas');
  if (btnVoltar) {
    btnVoltar.addEventListener('click', () => {
      renderLocalList();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initNav();

  const btnBuscar = qs('#btn-buscar-api');
  if (btnBuscar) btnBuscar.addEventListener('click', handleSearchClick);

  const btnFav = qs('#btn-favoritos');
  if (btnFav) btnFav.addEventListener('click', renderFavoritesList);

  const btnMinhas = qs('#btn-minhas');
  if (btnMinhas) btnMinhas.addEventListener('click', renderLocalList);

  const modal = qs('#modal');
  if (modal && !modal.classList.contains('hidden')) modal.classList.add('hidden');
});
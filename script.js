document.addEventListener("DOMContentLoaded", function () {
  const apiUrl = "https://api.valantis.store:41000/";
  const password = "Valantis";
  const productListContainer = document.getElementById("product-list");
  const paginationContainer = document.getElementById("pagination-container");
  const filterContainer = document.getElementById("filter-container");
  const loading = document.getElementById("loading-indicator");
  const filterInput = document.getElementById("filterInput");
  const itemsPerPage = 50;
  let currentPage = 0;
  let currentFilterValue = "";
  let filterTimeout; // Добавленный таймаут

  // Функция для аутентификации запросов
  function authenticate() {
    const timestamp = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const authString = md5(`${password}_${timestamp}`);
    return {
      headers: {
        "X-Auth": authString,
      },
    };
  }

  // Событие для поля ввода фильтра
  filterInput.addEventListener("input", function () {
    clearTimeout(filterTimeout); // Очищаем предыдущий таймаут

    filterTimeout = setTimeout(function () {
      const filterValue = filterInput.value.trim();
      currentFilterValue = filterValue;
      loadPage(currentPage);
    }, 1500); // Задержка для применения фильтра
  });

  // Функция для получения идентификаторов продуктов
  async function getIds(offset, limit) {
    try {
      const filterParams = currentFilterValue ? { value: currentFilterValue } : {};
      const response = await fetch(`${apiUrl}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authenticate().headers,
        },
        body: JSON.stringify({
          action: "get_ids",
          params: { offset, limit, filter: filterParams },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Expected JSON response but received non-JSON response"
        );
      }

      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error("Error fetching product ids:", error);
    }
  }

  // Функция для получения продуктов
  async function fetchProducts(ids) {
    try {
      const filterParams = currentFilterValue ? { value: currentFilterValue } : {};
      const response = await fetch(`${apiUrl}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authenticate().headers,
        },
        body: JSON.stringify({
          action: "get_items",
          params: { ids, filter: filterParams },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Expected JSON response but received non-JSON response"
        );
      }

      const result = await response.json();
      return filterDuplicates(result.result, "id");
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  }

  // Функция для фильтрации дубликатов
  function filterDuplicates(array, key) {
    const seen = new Set();
    return array.filter((item) => {
      const value = item[key];
      if (!seen.has(value)) {
        seen.add(value);
        return true;
      }
      return false;
    });
  }

  // Функция для отрисовки продуктов
  function renderProducts(products) {
    productListContainer.innerHTML = "";
    products.forEach((product) => {
      const productElement = document.createElement("div");
      productElement.classList.add("product");
      productElement.innerHTML = `
          <div>
            <p class="id-product">${product.id}</p>
            <p>${product.product ? product.product : ''} - <span>${product.price}р.</span> ${
        product.brand ? product.brand : ""
      }</p>
          </div>
      `;
      productListContainer.appendChild(productElement);
    });
  
    loading.classList.add("hidden");
    paginationContainer.classList.remove("hidden");
    filterContainer.classList.remove("hidden");
  }

  // Функция для загрузки страницы
  async function loadPage(page) {
    try {
      loading.classList.remove("hidden");
      paginationContainer.classList.add("hidden");
      filterContainer.classList.add("hidden");
      productListContainer.classList.add("hidden");
  
      const offset = (page - 1) * itemsPerPage;
      const ids = await getIds(offset, itemsPerPage);
      const products = await fetchProducts(ids);
  
      // Фильтрация продуктов по введенному значению
      const filteredProducts = products.filter(product => {
        const productName = product.product ? product.product.toLowerCase() : '';
        return productName.includes(currentFilterValue.toLowerCase());
      });
  
      // Сортировка отфильтрованных продуктов
      filteredProducts.sort((a, b) => {
        const valueA = (a.product && a.product.product) ? a.product.product.toLowerCase() : '';
        const valueB = (b.product && b.product.product) ? b.product.product.toLowerCase() : '';
        return valueA.localeCompare(valueB);
      });
  
      renderProducts(filteredProducts);
      currentPage = page;
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      loading.classList.add("hidden");
      paginationContainer.classList.remove("hidden");
      filterContainer.classList.remove("hidden");
      productListContainer.classList.remove("hidden");
    }
  }

  // Функция для обновления интерфейса пагинации
  function updatePaginationUI() {
    document.getElementById("current-page").textContent = (
      currentPage + 1
    ).toString();
  }

  // Обработчики событий для кнопок навигации
  document.getElementById("prev-btn").addEventListener("click", function () {
    if (currentPage > 0) {
      currentPage--;
      loadPage(currentPage);
      updatePaginationUI();
    }
  });

  document.getElementById("next-btn").addEventListener("click", function () {
    currentPage++;
    loadPage(currentPage);
    updatePaginationUI();
  });

  // Инициальная загрузка первой страницы
  loadPage(currentPage);
  updatePaginationUI();
});

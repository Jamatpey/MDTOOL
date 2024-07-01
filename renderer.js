const { ipcRenderer } = require('electron');
const xlsx = require('xlsx');
const fs = require('fs');
const ExcelJS = require('exceljs');
const instances = 4; // Cantidad de instancias
let selectedFiles = new Array(instances).fill([]); // Arreglo para almacenar los archivos seleccionados
let allData = new Array(instances).fill([]); // Arreglo para almacenar los datos de cada instancia
let statusOptions = new Array(instances).fill([]); // Arreglo para opciones de estado de cada instancia
let slaToOptions = new Array(instances).fill([]); // Arreglo para opciones de asignado a de cada instancia
let assignedToOptions = new Array(instances).fill([]); // Arreglo para opciones de asignado a de cada instancia
let currentFilters = new Array(instances).fill({ statusFilter: '', assignedToFilter: '', slaToFilter:'' }); // Arreglo para filtros actuales de cada instancia
let savedFilters = new Array(instances).fill({ statusFilter: '', assignedToFilter: '' , slaToFilter:''}); // Arreglo para filtros guardados de cada instancia
let instanceNames = new Array(instances).fill('Instancia'); // Arreglo para almacenar los nombres de cada instancia

// Función para inicializar cada instancia
function initializeInstance(instanceIndex) {

    
    const instanceContainer = document.createElement('div');
    instanceContainer.classList.add('instance-container');

    const instanceHeaderContainer = document.createElement('div');
    instanceHeaderContainer.classList.add('instance-header');

    const nameAndEditContainer = document.createElement('div');
    nameAndEditContainer.classList.add('name-edit-container');

    const instanceHeader = document.createElement('h2');
    instanceHeader.classList.add('instance-name');
    instanceHeader.textContent = `Instancia ${instanceIndex + 1}`;
    nameAndEditContainer.appendChild(instanceHeader);

    const instanceNameInput = document.createElement('input');
    instanceNameInput.classList.add('form-control');
    instanceNameInput.type = 'text';
    instanceNameInput.placeholder = 'Ingrese el nombre de la instancia';
    instanceNameInput.style.display = 'none'; // Ocultar input inicialmente
    instanceNameInput.addEventListener('blur', () => {
        instanceNames[instanceIndex] = instanceNameInput.value.trim() || `Instancia ${instanceIndex + 1}`;
        instanceHeader.textContent = instanceNames[instanceIndex];
        instanceHeader.style.display = 'block';
        editIcon.style.display = 'block';
        instanceNameInput.style.display = 'none';
    });

    nameAndEditContainer.appendChild(instanceNameInput);

    const editIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    editIcon.setAttribute('width', '16');
    editIcon.setAttribute('height', '16');
    editIcon.setAttribute('viewBox', '0 0 16 16');
    editIcon.setAttribute('fill', 'currentColor');
    editIcon.classList.add('edit-icon');
    editIcon.innerHTML = `
        <path d="M15.825 2.31l-2.14-2.14a1.41 1.41 0 0 0-2 0L10.09 1.77 14.23 5.91l1.595-1.595a1.41 1.41 0 0 0 0-2zM0 12.585V16h3.415l9.475-9.475-3.415-3.415L0 12.585z"/>
    `;
    editIcon.addEventListener('click', () => {
        instanceHeader.style.display = 'none';
        editIcon.style.display = 'none';
        instanceNameInput.style.display = 'block';
        instanceNameInput.focus();
    });
    nameAndEditContainer.appendChild(editIcon);

    instanceHeaderContainer.appendChild(nameAndEditContainer);

    const filesListContainer = document.createElement('div');
    filesListContainer.classList.add('files-list');
    instanceHeaderContainer.appendChild(filesListContainer);

    const selectFilesBtn = document.createElement('button');
    selectFilesBtn.classList.add('btn', 'btn-primary');
    selectFilesBtn.textContent = 'Seleccionar Archivos';
    selectFilesBtn.addEventListener('click', async () => {
        const files = await ipcRenderer.invoke('open-file-dialog');
        if (files.length > 0) {
            selectedFiles[instanceIndex] = files;
            updateSelectedFilesUI(instanceIndex);
            loadData(instanceIndex);
        }
    });
    instanceHeaderContainer.appendChild(selectFilesBtn);
    instanceContainer.appendChild(instanceHeaderContainer);

    const deleteButton = document.createElement('button');
deleteButton.classList.add('btn', 'btn-delete');
deleteButton.textContent = 'Eliminar';
deleteButton.addEventListener('click', () => {
    selectedFiles[instanceIndex] = [];
    updateSelectedFilesUI(instanceIndex);
    allData[instanceIndex] = [];
    extractOptions(instanceIndex);
    applyFilters(instanceIndex);
});
instanceHeaderContainer.appendChild(deleteButton);

    instanceContainer.appendChild(instanceHeaderContainer);

   

    const filterSection = document.createElement('div');
    filterSection.classList.add('filter-section');

    const assignedToFilterLabel = document.createElement('label');
    assignedToFilterLabel.textContent = 'Asignado A:';
    filterSection.appendChild(assignedToFilterLabel);

    const assignedToFilterSelect = document.createElement('select');
    assignedToFilterSelect.id = `assigned-to-filter-${instanceIndex + 1}`;
    assignedToFilterSelect.addEventListener('change', () => {
        applyFilters(instanceIndex);
    });
    filterSection.appendChild(assignedToFilterSelect);

    const statusFilterLabel = document.createElement('label');
    statusFilterLabel.textContent = 'Status:';
    filterSection.appendChild(statusFilterLabel);

    const statusFilterSelect = document.createElement('select');
    statusFilterSelect.id = `status-filter-${instanceIndex + 1}`;
    statusFilterSelect.addEventListener('change', () => {
        applyFilters(instanceIndex);
    });
    filterSection.appendChild(statusFilterSelect);

    const SlaToFilterLabel = document.createElement('label');
    SlaToFilterLabel.textContent = 'Sla:';
    filterSection.appendChild(SlaToFilterLabel);

    const SlaToFilterSelect = document.createElement('select');
    SlaToFilterSelect.id = `sla-to-filter-${instanceIndex + 1}`;
    SlaToFilterSelect.addEventListener('change', () => {
        applyFilters(instanceIndex);
    });
    filterSection.appendChild(SlaToFilterSelect);

    const applyFilterBtn = document.createElement('button');
    applyFilterBtn.textContent = 'Aplicar Filtro';
    applyFilterBtn.id = `apply-filter-${instanceIndex + 1}`;
    applyFilterBtn.classList.add('hidden')
    applyFilterBtn.addEventListener('click', () => {
        saveCurrentFilters(instanceIndex);
        filterData(instanceIndex);
    });
    filterSection.appendChild(applyFilterBtn);

    const clearFiltersBtn = document.createElement('button');
    clearFiltersBtn.textContent = 'Limpiar Filtros';
    clearFiltersBtn.id = `clear-filters-${instanceIndex + 1}`;
    clearFiltersBtn.addEventListener('click', () => {
        clearFilters(instanceIndex);
    });
    filterSection.appendChild(clearFiltersBtn);

    instanceContainer.appendChild(filterSection);

    const filterResultsDiv = document.createElement('div');
    filterResultsDiv.id = `filter-results-${instanceIndex + 1}`;
    instanceContainer.appendChild(filterResultsDiv);

    document.getElementById('instances-container').appendChild(instanceContainer);

    // Cargar opciones de filtro al inicializar
    extractOptions(instanceIndex);
    enableFilterButton(instanceIndex);
}



// Actualizar la interfaz de usuario para mostrar los archivos seleccionados
function updateSelectedFilesUI(instanceIndex) {
    const filesListContainer = document.querySelector(`.instance-container:nth-child(${instanceIndex + 1}) .files-list`);
    filesListContainer.innerHTML = '';

    selectedFiles[instanceIndex].forEach((file, index) => {
        const fileEntry = document.createElement('div');
        fileEntry.classList.add('file-entry');
        filesListContainer.appendChild(fileEntry);
    });
}


// Cargar datos para una instancia específica
// Cargar datos para una instancia específica
async function loadData(instanceIndex) {
    allData[instanceIndex] = [];

    // Función para cargar los datos de un archivo
    async function loadFileData(file) {
        try {
            const workbook = xlsx.readFile(file);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = xlsx.utils.sheet_to_json(sheet, { raw: false, defval: null });
            const normalizedData = data.map(row => {
                const normalizedRow = {};
                Object.keys(row).forEach(key => {
                    normalizedRow[key.toLowerCase()] = row[key];
                });
                return normalizedRow;
            });
            return { file, data: normalizedData, lastModifiedTime: getFileLastModifiedTime(file) };
        } catch (error) {
            console.error('Error al leer el archivo:', error);
            return null;
        }
    }

    // Cargar datos de todos los archivos seleccionados
    const promises = selectedFiles[instanceIndex].map(loadFileData);
    const results = await Promise.all(promises);
    allData[instanceIndex] = results.filter(result => result !== null);

    // Extraer opciones de filtro y aplicar filtros guardados
    extractOptions(instanceIndex);
    applyFilters(instanceIndex);

    // Iniciar la monitorización de cambios en los archivos
    selectedFiles[instanceIndex].forEach(file => {
        fs.watchFile(file, { interval: 5000 }, (curr, prev) => {
            if (curr.mtime > prev.mtime) {
                console.log(`El archivo ${file} ha sido modificado.`);
                loadData(instanceIndex); // Volver a cargar los datos al detectar cambios
            }
        });
    });
}


// Extraer opciones de filtro para una instancia específica
function extractOptions(instanceIndex) {
    statusOptions[instanceIndex] = [];
    assignedToOptions[instanceIndex] = [];
    slaToOptions[instanceIndex] = [];

    allData[instanceIndex].forEach(({ data }) => {
        data.forEach(row => {
            // Verificar si la fila coincide con los filtros activos
            const statusMatches = !currentFilters[instanceIndex].statusFilter || (row['status'] && row['status'].toLowerCase() === currentFilters[instanceIndex].statusFilter);
            const assignedToMatches = !currentFilters[instanceIndex].assignedToFilter || (row['assigned to'] && row['assigned to'].toLowerCase() === currentFilters[instanceIndex].assignedToFilter);
            const slaToMatches = !currentFilters[instanceIndex].slaToFilter || (row['sla flag'] && row['sla flag'].toLowerCase() === currentFilters[instanceIndex].slaToFilter);

            if (statusMatches && assignedToMatches && slaToMatches) {
                // Agregar opciones únicas para cada filtro
                if (row['status'] && !statusOptions[instanceIndex].includes(row['status'])) {
                    statusOptions[instanceIndex].push(row['status']);
                }
                if (row['assigned to'] && !assignedToOptions[instanceIndex].includes(row['assigned to'])) {
                    assignedToOptions[instanceIndex].push(row['assigned to']);
                }
                if (row['sla flag'] && !slaToOptions[instanceIndex].includes(row['sla flag'])) {
                    slaToOptions[instanceIndex].push(row['sla flag']);
                }
            }
        });
    });

    // Ordenar las opciones alfabéticamente
    statusOptions[instanceIndex].sort();
    assignedToOptions[instanceIndex].sort();
    slaToOptions[instanceIndex].sort();

    // Actualizar selectores de filtro con las opciones extraídas
    populateSelectOptions(`status-filter-${instanceIndex + 1}`, statusOptions[instanceIndex], savedFilters[instanceIndex].statusFilter);
    populateSelectOptions(`assigned-to-filter-${instanceIndex + 1}`, assignedToOptions[instanceIndex], savedFilters[instanceIndex].assignedToFilter);
    populateSelectOptions(`sla-to-filter-${instanceIndex + 1}`, slaToOptions[instanceIndex], savedFilters[instanceIndex].slaToFilter);
}




// Función para poblar opciones en un select
function populateSelectOptions(selectId, options, selectedValue) {
    const selectElement = document.getElementById(selectId);
    selectElement.innerHTML = '';

    // Agregar opciones disponibles
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.textContent = option;
        optionElement.value = option.toLowerCase();
        selectElement.appendChild(optionElement);
    });

    // Mostrar la opción "Vacío" solo si no hay ninguna opción seleccionada
    const emptyOption = document.createElement('option');
    emptyOption.textContent = 'Vacío';
    emptyOption.value = '';
    if (!selectedValue || !options.includes(selectedValue.toLowerCase())) {
        emptyOption.selected = true; // Seleccionar "Vacío" si no hay valor seleccionado o si el valor seleccionado no está en las opciones
    }
    selectElement.appendChild(emptyOption);

    // Establecer la opción seleccionada
    selectElement.value = selectedValue.toLowerCase(); // Asegurar que el valor seleccionado sea en minúsculas
}




// Aplicar filtros para una instancia específica
function applyFilters(instanceIndex) {
    const statusFilterElement = document.getElementById(`status-filter-${instanceIndex + 1}`);
    const assignedToFilterElement = document.getElementById(`assigned-to-filter-${instanceIndex + 1}`);
    const slaToFilterElement = document.getElementById(`sla-to-filter-${instanceIndex + 1}`);

    let statusFilter = statusFilterElement.value.toLowerCase();
    let assignedToFilter = assignedToFilterElement.value.toLowerCase();
    let slaToFilter = slaToFilterElement.value.toLowerCase();

    // Convertir opción "vacío" a una cadena vacía para la lógica de filtro
    if (statusFilter === 'vacío') {
        statusFilter = '';
    }
    if (assignedToFilter === 'vacío') {
        assignedToFilter = '';
    }
    if (slaToFilter === 'vacío') {
        slaToFilter = '';
    }

    currentFilters[instanceIndex] = { statusFilter, assignedToFilter, slaToFilter };
    savedFilters[instanceIndex] = { statusFilter, assignedToFilter, slaToFilter };

    // Extraer nuevas opciones basadas en los filtros actuales
    extractOptions(instanceIndex);
    filterData(instanceIndex);
}




// Filtrar datos para una instancia específica
function filterData(instanceIndex) {
    const statusFilter = currentFilters[instanceIndex].statusFilter.toLowerCase();
    const assignedToFilter = currentFilters[instanceIndex].assignedToFilter.toLowerCase();
    const slaToFilter = currentFilters[instanceIndex].slaToFilter.toLowerCase();

    const filterResults = document.getElementById(`filter-results-${instanceIndex + 1}`);
    filterResults.innerHTML = '';

    let filteredData = [];

    allData[instanceIndex].forEach(({ data }) => {
        const filtered = data.filter(row => {
            const statusMatches = !statusFilter || (row['status'] && row['status'].toLowerCase() === statusFilter);
            const assignedToMatches = !assignedToFilter || (row['assigned to'] && row['assigned to'].toLowerCase() === assignedToFilter);
            const slaToMatches = !slaToFilter || (row['sla flag'] && row['sla flag'].toLowerCase() === slaToFilter);
            return statusMatches && assignedToMatches && slaToMatches;
        });
        filteredData = filteredData.concat(filtered);
    });

    if (filteredData.length > 0) {
        const groupedByAssignedTo = filteredData.reduce((acc, row) => {
            const assignedTo = row['assigned to'];
            if (!acc[assignedTo]) {
                acc[assignedTo] = 0;
            }
            acc[assignedTo]++;
            return acc;
        }, {});

        const resultTable = document.createElement('table');
        resultTable.classList.add('results-table'); // Añadir clase para estilos de tabla
        const headerRow = document.createElement('tr');
        ['Asignado A', 'Cantidad'].forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        resultTable.appendChild(headerRow);

        Object.keys(groupedByAssignedTo).forEach(key => {
            const tr = document.createElement('tr');
            const tdAssignedTo = document.createElement('td');
            tdAssignedTo.textContent = key;
            tr.appendChild(tdAssignedTo);

            const tdCount = document.createElement('td');
            tdCount.textContent = groupedByAssignedTo[key];
            tr.appendChild(tdCount);

            resultTable.appendChild(tr);
        });

        filterResults.appendChild(resultTable);
    } else {
        filterResults.textContent = 'No se encontraron resultados';
        filterResults.classList.add('no-results-message'); // Añadir clase para mensaje de resultados no encontrados
    }
}



// Verificar cambios en archivos para una instancia específica
// Verificar cambios en archivos para una instancia específica
function checkFileChanges(instanceIndex) {
    selectedFiles[instanceIndex].forEach(file => {
        try {
            const stats = fs.statSync(file);
            const index = allData[instanceIndex].findIndex(item => item.file === file);
            if (index !== -1 && stats.mtimeMs > allData[instanceIndex][index].lastModifiedTime) {
                const workbook = xlsx.readFile(file);
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const data = xlsx.utils.sheet_to_json(sheet);
                const normalizedData = data.map(row => {
                    const normalizedRow = {};
                    Object.keys(row).forEach(key => {
                        normalizedRow[key.toLowerCase()] = row[key];
                    });
                    return normalizedRow;
                });
                allData[instanceIndex][index].data = normalizedData;
                allData[instanceIndex][index].lastModifiedTime = stats.mtimeMs;
                extractOptions(instanceIndex);
                applyFilters(instanceIndex);
                filterData(instanceIndex);
            }
        } catch (error) {
            console.error('Error al verificar cambios en el archivo:', error);
        }
    });
}


// Obtener la última fecha de modificación de un archivo
function getFileLastModifiedTime(file) {
    try {
        const stats = fs.statSync(file);
        return stats.mtimeMs;
    } catch (error) {
        console.error('Error al obtener la última fecha de modificación del archivo:', error);
        return 0;
    }
}

// Guardar filtros actuales para una instancia específica
function saveCurrentFilters(instanceIndex) {
    const statusFilter = document.getElementById(`status-filter-${instanceIndex + 1}`).value.toLowerCase();
    const assignedToFilter = document.getElementById(`assigned-to-filter-${instanceIndex + 1}`).value.toLowerCase();
    const slaToFilter = document.getElementById(`sla-to-filter-${instanceIndex + 1}`).value.toLowerCase();
    currentFilters[instanceIndex] = { statusFilter, assignedToFilter, slaToFilter };
    savedFilters[instanceIndex] = { statusFilter, assignedToFilter, slaToFilter };

    updateSelectedFilters(instanceIndex); // Actualizar los filtros seleccionados visualmente
}


// Limpiar filtros para una instancia específica
function clearFilters(instanceIndex) {
    const statusFilterElement = document.getElementById(`status-filter-${instanceIndex + 1}`);
    const assignedToFilterElement = document.getElementById(`assigned-to-filter-${instanceIndex + 1}`);
    const slaToFilterElement = document.getElementById(`sla-to-filter-${instanceIndex + 1}`);

    statusFilterElement.value = '';
    assignedToFilterElement.value = '';
    slaToFilterElement.value = '';

    saveCurrentFilters(instanceIndex);
    applyFilters(instanceIndex);
    updateSelectedFilters(instanceIndex); // Actualizar los filtros seleccionados visualmente
}


// Habilitar botón de filtro para una instancia específica
function enableFilterButton(instanceIndex) {
    const filterBtn = document.getElementById(`apply-filter-${instanceIndex + 1}`);
    filterBtn.disabled = false;
}

// Inicializar cada instancia al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    for (let i = 0; i < instances; i++) {
        initializeInstance(i);
    }
});
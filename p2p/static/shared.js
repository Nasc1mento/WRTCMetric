"use strict";

const showJson = (json, id) => {
    document.getElementById(id).textContent = JSON.stringify(json, null, 2);
}

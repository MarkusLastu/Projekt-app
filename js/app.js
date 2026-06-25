

// #region ELEMENT
/* Här hämtar du allt från HTML. */

const button = document.getElementById("x");
const buttons = document.querySelectorAll("y");

// #endregion

// #region STATE
/* Vilken information behöver programmet komma ihåg? */

let globalVariable = null;

// #endregion

// #region EVENT LISTENERS
/* Här kopplar du alla lyssnare. */

button.addEventListener("click", function (inputValue) {
   console.log(inputValue);
});

button.addEventListener("click", funcionName());
// #endregion

// #region FUNCTIONS
/* Här ligger all logik. */
 
function functionName(inputValue) {
   console.log(inputValue);
}

// #endregion

// #region STARTUP
/* Kod som ska köras när sidan laddas. */



// #endregion


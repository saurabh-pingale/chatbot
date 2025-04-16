export function createUserQuerySlider(queries, onClickQuery) {
    const sliderWrapper = document.createElement('div');
    sliderWrapper.className = 'user-query-slider';
  
    queries.forEach(query => {
      const queryButton = document.createElement('button');
      queryButton.className = 'user-query-button';
      queryButton.innerText = query;
      queryButton.onclick = () => onClickQuery(query);
      sliderWrapper.appendChild(queryButton);
    });
  
    return sliderWrapper;
  }
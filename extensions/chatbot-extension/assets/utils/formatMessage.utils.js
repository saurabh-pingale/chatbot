export function formatMessageText(text) {
  text = text.replace(/â€¢/g, '•');
  
  const lines = text.split('\n');
  let formattedHtml = '';
  let inList = false;
  let paragraphText = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '' && i > 0 && i < lines.length - 1) {
      const prevLine = lines[i-1].trim();
      const nextLine = lines[i+1].trim();
      if (prevLine.startsWith('•') && nextLine.startsWith('•')) {
        continue;
      }
    }
    
    if (line.startsWith('•')) {
      if (paragraphText && !inList) {
        formattedHtml += `<p>${paragraphText}</p>`;
        paragraphText = '';
      }
      
      if (!inList) {
        formattedHtml += '<ul class="message-list-items">';
        inList = true;
      }
      formattedHtml += `<li>${line.substring(1).trim()}</li>`;
    } else {
      if (inList) {
        formattedHtml += '</ul>';
        inList = false;
      }
      
      if (line) {
        if (paragraphText) {
          paragraphText += ' ' + line;
        } else {
          paragraphText = line;
        }
      } 
      else if (paragraphText) {
        formattedHtml += `<p>${paragraphText}</p>`;
        paragraphText = '';
      }
    }
  }
  
  if (inList) {
    formattedHtml += '</ul>';
  }
  
  if (paragraphText) {
    formattedHtml += `<p>${paragraphText}</p>`;
  }
  
  return formattedHtml;
}
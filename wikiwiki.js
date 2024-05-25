document.addEventListener("DOMContentLoaded", function() {
    const leftIframe = document.getElementById('left-iframe');
    const rightIframe = document.getElementById('right-iframe');
    const pathDiv = document.getElementById('path');
    const targetPageButton = document.getElementById('target-page-button');
    const startPageButton = document.getElementById('start-page-button');
    const scoreElement = document.getElementById('score');
    
    let path = [];
    let clickCount = 0;
    let targetTitle = '';
    
    const wikiApiUrl = 'https://en.wikipedia.org/w/api.php';
    const corsProxy = 'https://corsproxy.io/?';
    const wikiBaseUrl = 'https://en.wikipedia.org';

    // Function to fetch random Wikipedia article title from a specific category
    async function fetchRandomArticleTitle() {
        const category = 'Category:All_articles_with_unsourced_statements'; // You can change this category as needed
        const response = await fetch(`${corsProxy}${wikiApiUrl}?action=query&list=categorymembers&cmtitle=${category}&cmlimit=50&format=json&origin=*`);
        const data = await response.json();
        const randomIndex = Math.floor(Math.random() * data.query.categorymembers.length);
        return data.query.categorymembers[randomIndex].title;
    }

    // Function to fetch Wikipedia page content by title
    async function fetchPageContent(title) {
        const response = await fetch(`${corsProxy}${wikiApiUrl}?action=parse&page=${title}&format=json&origin=*`);
        const data = await response.json();
        return data.parse.text['*'];
    }

    // Function to fetch and embed necessary styles
    async function fetchStyles() {
        const response = await fetch(`${corsProxy}${wikiBaseUrl}/w/load.php?debug=false&lang=en&modules=site.styles&only=styles&skin=vector`);
        const styles = await response.text();
        return `<style>${styles}</style>`;
    }

    // Function to embed full URLs for images
    function fixImageUrls(content) {
        return content.replace(/src="\/\//g, `src="https://`);
    }

    // Function to set iframe content with fallback for Safari
    function setIframeContent(iframe, content) {
        if ('srcdoc' in iframe) {
            iframe.srcdoc = content;
        } else {
            iframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(content);
        }
    }

    // Load initial pages
    Promise.all([fetchRandomArticleTitle(), fetchRandomArticleTitle(), fetchStyles()])
        .then(async ([leftTitle, rightTitle, styles]) => {
            targetTitle = leftTitle;
            console.log(`Target page: ${targetTitle}`);
            
            let leftContent = await fetchPageContent(leftTitle);
            let rightContent = await fetchPageContent(rightTitle);
            
            leftContent = styles + fixImageUrls(leftContent);
            rightContent = styles + fixImageUrls(rightContent);

            setIframeContent(leftIframe, leftContent);
            setIframeContent(rightIframe, rightContent);

            // Disable links in the target iframe
            leftIframe.onload = function() {
                const leftDoc = leftIframe.contentDocument || leftIframe.contentWindow.document;
                if (leftDoc) {
                    const links = leftDoc.getElementsByTagName('a');
                    for (let link of links) {
                        link.style.pointerEvents = 'none';
                        link.style.cursor = 'default';
                    }
                }
            };

            // Update the instructions with the page titles
            targetPageButton.textContent = targetTitle;
            startPageButton.textContent = rightTitle;
            
            pathDiv.innerHTML = `Start Page: ${rightTitle}`;
            path.push(rightTitle);
        })
        .catch(error => {
            console.error('Error during initial page load:', error);
        });

    // Handle navigation in the right iframe
    rightIframe.addEventListener('load', function() {
        const rightDocument = rightIframe.contentDocument;
        if (!rightDocument) {
            console.error('Right iframe document not accessible');
            return;
        }

        rightDocument.body.addEventListener('click', async function(event) {
            if (event.target.tagName === 'A' && event.target.href.includes('/wiki/')) {
                event.preventDefault();
                const newTitle = event.target.getAttribute('href').replace('/wiki/', '');
                console.log(`Navigating to: ${newTitle}`);
                
                let newContent = await fetchPageContent(newTitle);
                newContent = fixImageUrls(newContent);
                
                setIframeContent(rightIframe, newContent);
                
                path.push(newTitle);
                clickCount++;
                updateScore();
                updatePath();
                checkWinCondition(newTitle);
            }
        });
    });

    function updateScore() {
        scoreElement.textContent = clickCount;
    }

    function updatePath() {
        pathDiv.innerHTML = path.map((title, index) => 
            `<div>${index + 1}. ${title}</div>`
        ).join('');
        pathDiv.innerHTML += `<div>Clicks: ${clickCount}</div>`;
    }

    function checkWinCondition(currentTitle) {
        console.log(`Checking win condition: ${currentTitle} === ${targetTitle}`);
        if (currentTitle === targetTitle) {
            alert(`Congratulations! You've reached the target page in ${clickCount} clicks.`);
            showNotification();
        }
    }

    function showNotification() {
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = '#4CAF50';
        notification.style.color = '#fff';
        notification.style.fontSize = '18px';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '1000';
        notification.innerText = 'Congratulations! You reached the target page!';
        document.body.appendChild(notification);

        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
    }
});

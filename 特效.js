// 特效
(function() {
    var existing = document.getElementById('colorful_bubbles_canvas_overlay');
    if (existing) existing.remove();

    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    var width = window.innerWidth;
    var height = window.innerHeight;
    var bubbles = [];
    var bubbleCount = 40;

    canvas.id = "colorful_bubbles_canvas_overlay";
    canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:999999;pointer-events:none;";
    document.body.appendChild(canvas);

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }
    window.addEventListener("resize", resize);
    resize();

    function getRandomColor() {
        var colors = [
            "70,130,180",   // 钢蓝色
            "100,149,237",  // 矢车菊蓝
            "123,104,238",  // 中紫罗兰色
            "106,90,205",   // 暗板岩蓝
            "72,61,139",    // 暗紫蓝色
            "47,79,79",     // 暗石板灰
            "60,179,113",   // 中海绿色
            "32,178,170",   // 浅海绿色
            "34,139,34",    // 森林绿
            "85,107,47",    // 暗橄榄绿
            "139,69,19",    // 鞍褐色
            "160,82,45",    // 赭色
            "178,34,34",    // 火砖红
            "128,0,0",      // 栗色
            "153,50,204"    // 暗兰花紫
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    function createBubble(initial) {
        var r = Math.random() * 15 + 8;
        var x, y;
        
        if (initial) {
            x = Math.random() * width;
            y = Math.random() * height;
        } else {
            x = Math.random() * width;
            y = height + r;
        }

        var color = getRandomColor();
        var opacity = 0.25 + Math.random() * 0.3;

        return {
            x: x,
            y: y,
            r: r,
            speed: r * 0.1 + Math.random() * 0.3,
            swing: Math.random() * Math.PI * 2,
            swingSpeed: 0.01 + Math.random() * 0.02,
            swingRange: Math.random() * 3 + 1,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.03 + Math.random() * 0.04,
            wobbleRange: 0.1 + Math.random() * 0.1,
            opacity: opacity,
            color: color,
            shimmer: Math.random() > 0.3,
            shimmerPhase: Math.random() * Math.PI * 2,
            life: 0,
            maxLife: 8000 + Math.random() * 4000
        };
    }

    // 气泡绘制
    function drawRealBubble(ctx, bubble) {
        ctx.save();
        ctx.translate(bubble.x, bubble.y);
        
        var wobbleX = 1 + Math.cos(bubble.wobble) * bubble.wobbleRange;
        var wobbleY = 1 + Math.sin(bubble.wobble * 1.3) * bubble.wobbleRange;
        
        var currentOpacity = bubble.opacity;
        if (bubble.shimmer) {
            bubble.shimmerPhase += 0.08;
            currentOpacity = bubble.opacity * (0.7 + 0.3 * Math.sin(bubble.shimmerPhase));
        }
        
        // 主气泡渐变
        var mainGradient = ctx.createRadialGradient(
            0, 0, 0,
            0, 0, bubble.r
        );
        mainGradient.addColorStop(0, `rgba(${bubble.color}, ${currentOpacity * 0.9})`);
        mainGradient.addColorStop(0.3, `rgba(${bubble.color}, ${currentOpacity * 0.7})`);
        mainGradient.addColorStop(0.6, `rgba(${bubble.color}, ${currentOpacity * 0.4})`);
        mainGradient.addColorStop(0.9, `rgba(${bubble.color}, ${currentOpacity * 0.1})`);
        mainGradient.addColorStop(1, `rgba(${bubble.color}, 0)`);
        
        // 边缘渐变
        var edgeGradient = ctx.createRadialGradient(
            0, 0, bubble.r * 0.7,
            0, 0, bubble.r
        );
        edgeGradient.addColorStop(0, `rgba(255,255,255,0)`);
        edgeGradient.addColorStop(0.8, `rgba(255,255,255,${currentOpacity * 0.1})`);
        edgeGradient.addColorStop(1, `rgba(255,255,255,${currentOpacity * 0.15})`);
        
        // 主高光
        var highlightGradient = ctx.createRadialGradient(
            -bubble.r * 0.25, -bubble.r * 0.25, 0,
            -bubble.r * 0.25, -bubble.r * 0.25, bubble.r * 0.6
        );
        highlightGradient.addColorStop(0, "rgba(255,255,255,0.95)");
        highlightGradient.addColorStop(0.6, "rgba(255,255,255,0.3)");
        highlightGradient.addColorStop(1, "rgba(255,255,255,0)");
        
        // 次要高光
        var secondaryHighlight = ctx.createRadialGradient(
            bubble.r * 0.15, bubble.r * 0.15, 0,
            bubble.r * 0.15, bubble.r * 0.15, bubble.r * 0.3
        );
        secondaryHighlight.addColorStop(0, "rgba(255,255,255,0.6)");
        secondaryHighlight.addColorStop(1, "rgba(255,255,255,0)");

        // 绘制气泡主体
        ctx.beginPath();
        ctx.ellipse(0, 0, bubble.r * wobbleX, bubble.r * wobbleY, 0, 0, Math.PI * 2);
        ctx.fillStyle = mainGradient;
        ctx.fill();

        // 边缘反光
        ctx.beginPath();
        ctx.ellipse(0, 0, bubble.r * wobbleX, bubble.r * wobbleY, 0, 0, Math.PI * 2);
        ctx.fillStyle = edgeGradient;
        ctx.fill();

        // 主高光
        ctx.beginPath();
        ctx.ellipse(-bubble.r * 0.25, -bubble.r * 0.25, 
                   bubble.r * 0.5 * wobbleX, bubble.r * 0.4 * wobbleY, 
                   0, 0, Math.PI * 2);
        ctx.fillStyle = highlightGradient;
        ctx.fill();

        // 次要高光
        ctx.beginPath();
        ctx.ellipse(bubble.r * 0.15, bubble.r * 0.15, 
                   bubble.r * 0.25 * wobbleX, bubble.r * 0.2 * wobbleY, 
                   0, 0, Math.PI * 2);
        ctx.fillStyle = secondaryHighlight;
        ctx.fill();

        // 边缘线
        if (bubble.r > 15) {
            ctx.beginPath();
            ctx.ellipse(0, 0, bubble.r * wobbleX, bubble.r * wobbleY, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,255,255,${currentOpacity * 0.08})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // 简化版气泡 - 同样简化边框
    function drawSimpleBubble(ctx, bubble) {
        ctx.save();
        ctx.translate(bubble.x, bubble.y);
        
        var currentOpacity = bubble.opacity;
        if (bubble.shimmer) {
            bubble.shimmerPhase += 0.08;
            currentOpacity = bubble.opacity * (0.7 + 0.3 * Math.sin(bubble.shimmerPhase));
        }
        
        // 主渐变
        var mainGradient = ctx.createRadialGradient(
            0, 0, 0,
            0, 0, bubble.r
        );
        mainGradient.addColorStop(0, `rgba(${bubble.color}, ${currentOpacity * 0.8})`);
        mainGradient.addColorStop(0.5, `rgba(${bubble.color}, ${currentOpacity * 0.5})`);
        mainGradient.addColorStop(0.9, `rgba(${bubble.color}, ${currentOpacity * 0.1})`);
        mainGradient.addColorStop(1, `rgba(${bubble.color}, 0)`);
        
        // 边缘反光
        var edgeGradient = ctx.createRadialGradient(
            0, 0, bubble.r * 0.6,
            0, 0, bubble.r
        );
        edgeGradient.addColorStop(0, `rgba(255,255,255,0)`);
        edgeGradient.addColorStop(1, `rgba(255,255,255,${currentOpacity * 0.08})`);
        
        // 高光
        var highlightGradient = ctx.createRadialGradient(
            -bubble.r * 0.2, -bubble.r * 0.2, 0,
            -bubble.r * 0.2, -bubble.r * 0.2, bubble.r * 0.5
        );
        highlightGradient.addColorStop(0, "rgba(255,255,255,0.9)");
        highlightGradient.addColorStop(0.8, "rgba(255,255,255,0.2)");
        highlightGradient.addColorStop(1, "rgba(255,255,255,0)");

        // 气泡主体
        ctx.beginPath();
        ctx.arc(0, 0, bubble.r, 0, Math.PI * 2);
        ctx.fillStyle = mainGradient;
        ctx.fill();

        // 边缘反光
        ctx.beginPath();
        ctx.arc(0, 0, bubble.r, 0, Math.PI * 2);
        ctx.fillStyle = edgeGradient;
        ctx.fill();

        // 高光
        ctx.beginPath();
        ctx.arc(-bubble.r * 0.2, -bubble.r * 0.2, bubble.r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = highlightGradient;
        ctx.fill();
        
        ctx.restore();
    }

    function init() {
        for (var i = 0; i < bubbleCount; i++) {
            bubbles.push(createBubble(true));
        }
        loop();
    }

    function loop() {
        ctx.clearRect(0, 0, width, height);

        for (var i = 0; i < bubbleCount; i++) {
            var b = bubbles[i];

            b.swing += b.swingSpeed;
            b.wobble += b.wobbleSpeed;
            b.y -= b.speed;
            b.x += Math.cos(b.swing) * b.swingRange * 0.1;
            b.life += 16;

            if (b.r > 12) {
                drawRealBubble(ctx, b);
            } else {
                drawSimpleBubble(ctx, b);
            }

            if (b.y < -b.r * 2 || b.life > b.maxLife || 
                b.x < -b.r * 2 || b.x > width + b.r * 2) {
                bubbles[i] = createBubble(false);
            }
        }
        requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
<div class="support-hero">
  <img src="Media/paradox-header.png" alt="Paradox AntiCheat Logo" class="hero-logo">
  <h1>Support & Community</h1>
  <center><p class="hero-subtitle">Connect with the Paradox Neural Link for real-time assistance and development insights.</p></center>
</div>

<div class="support-grid">
<div class="support-card content-card">
<div class="card-header">
<img src="https://img.icons8.com/ios-filled/50/00ffa3/conference-call.png" class="card-icon" />
<h3>Community Access</h3>
</div>
<p>Join the official Paradox AntiCheat community on Discord. Our space is dedicated to supporting Bedrock developers, sharing security configurations, and discussing the future of Minecraft server protection.</p>

<div class="feature-list">
<div class="feature-item"><span>✦</span> Real-time Technical Support</div>
<div class="feature-item"><span>✦</span> Community Feature Requests</div>
<div class="feature-item"><span>✦</span> Direct Access to Maintainers</div>
</div>

<div class="cta-actions">
<a href="https://discord.gg/qVd53N2xhq" class="btn btn-primary">Join Discord</a>
<a href="https://github.com/Visual1mpact/Paradox_AntiCheat/issues" class="btn btn-secondary">Report a Bug</a>
</div>
</div>

<div class="support-card widget-card">
<div class="widget-glass">
<iframe src="https://discord.com/widget?id=1075816636252160030&theme=dark" width="100%" height="500" allowtransparency="true" frameborder="0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>
</div>
</div>
</div>

<style>
  .support-hero {
    text-align: center;
    padding: 3rem 0;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 3rem;
  }
  .hero-logo { max-width: 750px; margin-bottom: 1rem; }
  .hero-subtitle { color: var(--text-muted); font-size: 1.2rem; max-width: 600px; margin: 0 auto; }

  .support-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
    align-items: flex-start;
  }
  .support-card { flex: 1; min-width: 320px; }
  
  .content-card h3 { margin-top: 0; font-size: 1.75rem; color: #fff; }
  .card-icon { width: 32px; margin-bottom: 1rem; }
  
  .feature-list { margin: 1.5rem 0; }
  .feature-item { margin-bottom: 0.5rem; color: var(--text-main); font-size: 0.95rem; }
  .feature-item span { color: var(--theme-color); margin-right: 8px; }

  .cta-actions { display: flex; gap: 1rem; margin-top: 2rem; }
  
  .btn {
    padding: 0.8rem 1.5rem;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
    text-align: center;
    flex: 1;
  }
  .btn-primary { 
    background: var(--theme-color); 
    color: #000 !important; 
    box-shadow: 0 4px 15px var(--accent-glow);
  }
  .btn-secondary { 
    border: 1px solid var(--border-color); 
    color: #fff !important;
    background: rgba(255,255,255,0.03);
  }
  .btn:hover { transform: translateY(-2px); opacity: 0.9; }

  .widget-glass {
    background: rgba(15, 23, 42, 0.3);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 10px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.4);
    overflow: hidden;
  }

  @media (max-width: 900px) {
    .support-grid {
      flex-direction: column;
    }
    .support-card { width: 100%; }
  }
</style>

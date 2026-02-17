/**
 * Mr. Dollars — Dashboard Controller v2
 *
 * Professional rendering with:
 * - Staggered card entrance animations (reveal-item class)
 * - Animated number counting (countUp)
 * - Status-indicator edge glow on metric cards
 * - Smooth DOM transitions
 */

class Dashboard {
    constructor() {
        this.currentReport = null;
    }

    // === Animated number counter ===
    static countUp(element, target, format, duration = 900) {
        const start = performance.now();
        const initial = 0;

        function step(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out-expo
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const current = initial + (target - initial) * eased;

            switch (format) {
                case 'pct':
                    element.textContent = `${(current * 100).toFixed(1)}%`;
                    break;
                case 'dollar':
                    element.textContent = `$${current.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    break;
                default:
                    element.textContent = String(Math.round(current));
            }

            if (progress < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    // === Staggered reveal ===
    static revealCards(container, selector = '.glass-card') {
        const cards = container.querySelectorAll(selector);
        cards.forEach((card, i) => {
            card.classList.add('reveal-item');
            card.style.animationDelay = `${i * 0.08}s`;
        });
    }

    // === Renderers ===

    renderScoreboard(scoreboard, variance) {
        const grid = document.getElementById('scoreboard-grid');
        if (!grid) return;

        const metrics = [
            { key: 'utilization',         label: 'Utilization',  format: 'pct',    goodAbove: 0.7,  warnAbove: 0.5 },
            { key: 'net_margin',          label: 'Net Margin',   format: 'pct',    goodAbove: 0.25, warnAbove: 0.15 },
            { key: 'avg_ticket',          label: 'Avg Ticket',   format: 'dollar', goodAbove: 60,   warnAbove: 40 },
            { key: 'rebook_rate',         label: 'Rebook Rate',  format: 'pct',    goodAbove: 0.45, warnAbove: 0.30 },
            { key: 'returning_rate',      label: 'Returning',    format: 'pct',    goodAbove: 0.55, warnAbove: 0.35 },
            { key: 'no_show_rate',        label: 'No-Show',      format: 'pct',    invertColor: true, goodAbove: 0, warnAbove: 0.03 },
            { key: 'cancel_rate',         label: 'Cancel Rate',  format: 'pct',    invertColor: true, goodAbove: 0, warnAbove: 0.07 },
            { key: 'weekly_net_cash_est', label: 'Weekly Cash',  format: 'dollar', goodAbove: 500,  warnAbove: 200 },
        ];

        grid.innerHTML = metrics.map(m => {
            const value = scoreboard[m.key];
            if (value === undefined) return '';

            const colorClass = this._getColorClass(value, m);
            const v = variance && variance[m.key];
            let deltaHtml = '';
            let barHtml = '';

            if (v && v.delta !== undefined) {
                const deltaFmt = this._formatValue(Math.abs(v.delta), m.format);
                const sign = v.delta >= 0 ? '+' : '\u2212';
                const deltaClass = m.invertColor
                    ? (v.delta <= 0 ? 'positive' : 'negative')
                    : (v.delta >= 0 ? 'positive' : 'negative');
                deltaHtml = `<div class="delta ${deltaClass}">${sign}${deltaFmt} vs target</div>`;
            }

            if (v && v.target) {
                const pct = Math.min(100, Math.max(0, (value / v.target) * 100));
                const barColor = colorClass === 'good' ? '#22c55e'
                    : colorClass === 'warn' ? '#eab308' : '#ef4444';
                barHtml = `<div class="variance-track"><div class="variance-fill" style="width:${pct}%;background:${barColor}"></div></div>`;
            }

            return `
                <div class="glass-card metric-card status-${colorClass}" data-value="${value}" data-format="${m.format}">
                    <div class="label">${m.label}</div>
                    <div class="value ${colorClass}" data-count-target="${value}" data-count-format="${m.format}">0</div>
                    ${deltaHtml}${barHtml}
                </div>`;
        }).join('');

        // Staggered reveal
        Dashboard.revealCards(grid);

        // Animate numbers after a brief delay for the reveal to start
        setTimeout(() => {
            grid.querySelectorAll('[data-count-target]').forEach(el => {
                const target = parseFloat(el.dataset.countTarget);
                const format = el.dataset.countFormat;
                Dashboard.countUp(el, target, format, 1100);
            });
        }, 200);
    }

    renderDecisions(decisions) {
        const container = document.getElementById('decisions-list');
        if (!container) return;

        if (!decisions || decisions.length === 0) {
            container.innerHTML = '<div class="glass-card decision-row" style="color:var(--text-muted)">No decisions this period.</div>';
            return;
        }

        container.innerHTML = decisions.map(d => {
            const chip = d.verdict.toLowerCase();
            const key = d.key.replace(/_/g, ' ');
            return `
                <div class="glass-card decision-row">
                    <span class="verdict-chip ${chip}">${d.verdict}</span>
                    <div class="decision-body">
                        <div class="key">${key}</div>
                        <div class="reason">${d.reason}</div>
                        <div class="conf">${(d.confidence * 100).toFixed(0)}% confidence</div>
                    </div>
                </div>`;
        }).join('');

        Dashboard.revealCards(container);
    }

    renderActions(actions) {
        const container = document.getElementById('actions-list');
        if (!container) return;

        if (!actions || actions.length === 0) {
            container.innerHTML = '<div class="glass-card action-row" style="color:var(--text-muted)">No actions required.</div>';
            return;
        }

        container.innerHTML = actions.map((a, i) => `
            <div class="glass-card action-row">
                <span class="action-num">${i + 1}</span>
                <span>${a}</span>
            </div>`).join('');

        Dashboard.revealCards(container);
    }

    renderLoomStatus(status) {
        const container = document.getElementById('loom-status');
        if (!container) return;

        const connected = status && status.status === 'connected';
        const statusText = connected ? 'Connected' : 'Disconnected';
        const dotClass = connected ? '' : 'disconnected';

        container.innerHTML = `
            <div class="loom-badge">$</div>
            <div class="loom-details">
                <div class="loom-label">Time Loom</div>
                <div class="loom-value">${statusText}</div>
            </div>
            <div class="connection-badge" style="margin-left:auto">
                <div class="status-dot ${dotClass}"></div>
            </div>`;
    }

    updateFromReport(report) {
        this.currentReport = report;

        const periodEl = document.getElementById('report-period');
        if (periodEl && report.period_start && report.period_end) {
            periodEl.textContent = `${report.period_start} \u2192 ${report.period_end}`;
        }

        const tsEl = document.getElementById('report-timestamp');
        if (tsEl && report.generated_at) {
            tsEl.textContent = `Generated: ${report.generated_at}`;
        }

        this.renderScoreboard(report.scoreboard, report.variance);
        this.renderDecisions(report.decisions);
        this.renderActions(report.next_actions);
    }

    _formatValue(value, format) {
        switch (format) {
            case 'pct':    return `${(value * 100).toFixed(1)}%`;
            case 'dollar': return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            default:       return String(value);
        }
    }

    _getColorClass(value, m) {
        if (m.invertColor) {
            if (value <= m.goodAbove) return 'good';
            if (value <= m.warnAbove) return 'warn';
            return 'bad';
        }
        if (value >= m.goodAbove) return 'good';
        if (value >= m.warnAbove) return 'warn';
        return 'bad';
    }
}

window.Dashboard = Dashboard;

/**
 * Mr. Dollars — Dashboard Controller
 *
 * Manages the report display, metric cards, decisions, and actions.
 * Connects to the backend via WebSocket for live updates.
 */

class Dashboard {
    constructor() {
        this.currentReport = null;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
    }

    /**
     * Render the scoreboard metrics into the grid.
     */
    renderScoreboard(scoreboard, variance) {
        const grid = document.getElementById('scoreboard-grid');
        if (!grid) return;

        const metrics = [
            {
                key: 'utilization',
                label: 'Utilization',
                format: 'pct',
                goodAbove: 0.7,
                warnAbove: 0.5,
            },
            {
                key: 'net_margin',
                label: 'Net Margin',
                format: 'pct',
                goodAbove: 0.25,
                warnAbove: 0.15,
            },
            {
                key: 'avg_ticket',
                label: 'Avg Ticket',
                format: 'dollar',
                goodAbove: 60,
                warnAbove: 40,
            },
            {
                key: 'rebook_rate',
                label: 'Rebook Rate',
                format: 'pct',
                goodAbove: 0.45,
                warnAbove: 0.30,
            },
            {
                key: 'returning_rate',
                label: 'Returning',
                format: 'pct',
                goodAbove: 0.55,
                warnAbove: 0.35,
            },
            {
                key: 'no_show_rate',
                label: 'No-Show',
                format: 'pct',
                invertColor: true,
                goodAbove: 0, // lower is better
                warnAbove: 0.03,
            },
            {
                key: 'cancel_rate',
                label: 'Cancel Rate',
                format: 'pct',
                invertColor: true,
                goodAbove: 0,
                warnAbove: 0.07,
            },
            {
                key: 'weekly_net_cash_est',
                label: 'Weekly Cash',
                format: 'dollar',
                goodAbove: 500,
                warnAbove: 200,
            },
        ];

        grid.innerHTML = metrics.map(m => {
            const value = scoreboard[m.key];
            if (value === undefined) return '';

            const formatted = this._formatValue(value, m.format);
            const colorClass = this._getColorClass(value, m);
            const v = variance && variance[m.key];
            let deltaHtml = '';

            if (v && v.delta !== undefined) {
                const deltaFormatted = this._formatValue(Math.abs(v.delta), m.format);
                const sign = v.delta >= 0 ? '+' : '-';
                const deltaClass = m.invertColor
                    ? (v.delta <= 0 ? 'positive' : 'negative')
                    : (v.delta >= 0 ? 'positive' : 'negative');
                deltaHtml = `<div class="metric-delta ${deltaClass}">${sign}${deltaFormatted} vs target</div>`;
            }

            // Variance bar
            let barHtml = '';
            if (v && v.target) {
                const pct = Math.min(100, Math.max(0, (value / v.target) * 100));
                const barColor = colorClass === 'good' ? '#22c55e'
                    : colorClass === 'warn' ? '#f59e0b' : '#ef4444';
                barHtml = `
                    <div class="variance-bar-container">
                        <div class="variance-bar" style="width:${pct}%; background:${barColor}"></div>
                    </div>`;
            }

            return `
                <div class="metric-card">
                    <div class="metric-label">${m.label}</div>
                    <div class="metric-value ${colorClass}">${formatted}</div>
                    ${deltaHtml}
                    ${barHtml}
                </div>`;
        }).join('');
    }

    /**
     * Render decisions list.
     */
    renderDecisions(decisions) {
        const container = document.getElementById('decisions-list');
        if (!container) return;

        if (!decisions || decisions.length === 0) {
            container.innerHTML = '<div class="decision-card">No decisions this period.</div>';
            return;
        }

        container.innerHTML = decisions.map(d => {
            const badgeClass = d.verdict.toLowerCase();
            const keyFormatted = d.key.replace(/_/g, ' ');
            return `
                <div class="decision-card">
                    <span class="verdict-badge ${badgeClass}">${d.verdict}</span>
                    <div class="decision-content">
                        <div class="decision-key">${keyFormatted}</div>
                        <div class="decision-reason">${d.reason}</div>
                        <div class="decision-confidence">Confidence: ${(d.confidence * 100).toFixed(0)}%</div>
                    </div>
                </div>`;
        }).join('');
    }

    /**
     * Render next actions.
     */
    renderActions(actions) {
        const container = document.getElementById('actions-list');
        if (!container) return;

        if (!actions || actions.length === 0) {
            container.innerHTML = '<div class="action-item">No actions required.</div>';
            return;
        }

        container.innerHTML = actions.map((a, i) => `
            <div class="action-item">
                <span class="action-number">${i + 1}</span>
                <span>${a}</span>
            </div>`
        ).join('');
    }

    /**
     * Render the Time Loom connection status.
     */
    renderLoomStatus(status) {
        const container = document.getElementById('loom-status');
        if (!container) return;

        const connected = status && status.status === 'connected';
        const dotClass = connected ? '' : 'disconnected';
        const statusText = connected ? 'Connected to Time Loom' : 'Disconnected';
        const details = status && status.details
            ? `Last sync: ${status.details.last_sync || 'N/A'}`
            : 'Not available';

        container.innerHTML = `
            <div class="loom-icon">$</div>
            <div class="loom-info">
                <div class="label">Time Loom</div>
                <div class="value">${statusText}</div>
            </div>
            <div class="status-indicator">
                <div class="status-dot ${dotClass}"></div>
            </div>`;
    }

    /**
     * Update the entire dashboard with a new report.
     */
    updateFromReport(report) {
        this.currentReport = report;

        // Update period display
        const periodEl = document.getElementById('report-period');
        if (periodEl && report.period_start && report.period_end) {
            periodEl.textContent = `${report.period_start} \u2192 ${report.period_end}`;
        }

        // Update timestamp
        const tsEl = document.getElementById('report-timestamp');
        if (tsEl && report.generated_at) {
            tsEl.textContent = `Generated: ${report.generated_at}`;
        }

        this.renderScoreboard(report.scoreboard, report.variance);
        this.renderDecisions(report.decisions);
        this.renderActions(report.next_actions);
    }

    // --- Formatting helpers ---

    _formatValue(value, format) {
        switch (format) {
            case 'pct':
                return `${(value * 100).toFixed(1)}%`;
            case 'dollar':
                return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            default:
                return String(value);
        }
    }

    _getColorClass(value, metricConfig) {
        if (metricConfig.invertColor) {
            // Lower is better (no-show, cancel)
            if (value <= metricConfig.goodAbove) return 'good';
            if (value <= metricConfig.warnAbove) return 'warn';
            return 'bad';
        }
        if (value >= metricConfig.goodAbove) return 'good';
        if (value >= metricConfig.warnAbove) return 'warn';
        return 'bad';
    }
}

window.Dashboard = Dashboard;

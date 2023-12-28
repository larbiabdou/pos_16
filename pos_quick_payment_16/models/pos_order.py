from odoo import api, fields, models, _
from odoo.exceptions import UserError
from odoo.tools import float_is_zero, float_round, float_repr, float_compare

import logging

_logger = logging.getLogger(__name__)


class PosConfig(models.Model):
    _inherit = 'pos.order'

    state = fields.Selection(selection_add=[('credit', 'Credit'), ('partially_paid', 'Partially Paid')])

    def action_pos_order_paid(self):
        self.ensure_one()

        # TODO: add support for mix of cash and non-cash payments when both cash_rounding and only_round_cash_method are True
        if not self.config_id.cash_rounding \
                or self.config_id.only_round_cash_method \
                and not any(p.payment_method_id.is_cash_count for p in self.payment_ids):
            total = self.amount_total
        else:
            total = float_round(self.amount_total, precision_rounding=self.config_id.rounding_method.rounding, rounding_method=self.config_id.rounding_method.rounding_method)

        isPaid = float_is_zero(total - self.amount_paid, precision_rounding=self.currency_id.rounding)
        if not isPaid:
            self.write({'state': 'paid'})
            return True
        if not isPaid and not self.config_id.cash_rounding:
            raise UserError(_("Order %s is not fully paid.", self.name))
        elif not isPaid and self.config_id.cash_rounding:
            currency = self.currency_id
            if self.config_id.rounding_method.rounding_method == "HALF-UP":
                maxDiff = currency.round(self.config_id.rounding_method.rounding / 2)
            else:
                maxDiff = currency.round(self.config_id.rounding_method.rounding)

            diff = currency.round(self.amount_total - self.amount_paid)
            if not abs(diff) <= maxDiff:
                raise UserError(_("Order %s is not fully paid.", self.name))

        self.write({'state': 'paid'})
        _logger.info(isPaid)

        return True

    @api.model
    def _process_order(self, order, draft, existing_order):
        order_id = super()._process_order(order, draft, existing_order)
        order = order['data']
        if order["is_credit_payment"] and order['payment_due']:
            self.create_account_move_from_pos(order, order['payment_due'], order_id)
        return order_id

    @api.model
    def _complete_values_from_session(self, session, values):
        values = super(PosConfig, self)._complete_values_from_session(session, values)
        if values.get('state') and values['state'] in ['paid', 'credit', 'partially_paid']:
            values['name'] = self._compute_order_name()
        return values

    def write(self, vals):
        for order in self:
            if vals.get('state') and vals['state'] in ['paid', 'credit', 'partially_paid'] and order.name == '/':
                vals['name'] = self._compute_order_name()
        return super(PosConfig, self).write(vals)

    @api.model
    def _prepare_from_pos(self, order_data, order_id):
        PosSession = self.env["pos.session"]
        session = PosSession.browse(order_data["pos_session_id"])
        journal_sale = self.env['account.journal'].search([('type', '=', 'sale')])
        _logger.info(order_data)
        return {
            'commande': order_data["name"],
            'pos_order_id': order_id,
            "partner_id": order_data["partner_id"],
            "invoice_origin": _("Point of Sale %s") % (session.name),
            'journal_id': journal_sale[0].id,
            "user_id": order_data["user_id"],
            "move_type": 'out_invoice',
            'is_pos_credit': True,
        }

    @api.model
    def _prepare_line_from_pos(self, amount_due):
        return {
            'product_id': self.env.ref('pos_quick_payment_16.pos_partner_credit').id,
            "quantity": 1,
            # 'account_id': self.env.ref('l10n_dz.1_dz_pcg_recv_pos').id,
            'price_unit': amount_due,
        }

    @api.model
    def create_account_move_from_pos(self, order_data, amount_due, order_id):

        # Create Draft Sale order
        order_vals = self._prepare_from_pos(order_data, order_id)
        _logger.info(order_data)
        move_id = self.env['account.move'].create(order_vals)

        # create Sale order lines
        lines = []
        order_line_vals = self._prepare_line_from_pos(amount_due)
        lines.append([0, 0, order_line_vals])
        # order_line_vals['move_id'] = account_move.id
        # account_move_line = AccountMoveLine.create(order_line_vals)
        move_id.invoice_line_ids = lines
        move_id.action_post()
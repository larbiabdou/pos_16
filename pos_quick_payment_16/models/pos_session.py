# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo import models


class POSSession(models.Model):
    _inherit = "pos.session"

    def _loader_params_res_partner(self):
        res = super()._loader_params_res_partner()
        res["search_params"]["fields"].append("allow_credit")
        res["search_params"]["fields"].append("pos_partner_credit")
        res["search_params"]["fields"].append("id")
        return res


    def _validate_session(self, balancing_account=False, amount_to_balance=0, bank_payment_method_diffs=None):
        res = super(POSSession, self)._validate_session(balancing_account, amount_to_balance, bank_payment_method_diffs)
        self.env['pos.order'].search([('session_id', '=', self.id), ('state', 'in', ['credit', 'partially_paid'])]).write({'state': 'done'})
        return res
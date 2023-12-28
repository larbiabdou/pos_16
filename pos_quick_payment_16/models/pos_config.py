from odoo import fields, models


class PosConfig(models.Model):
    _inherit = "pos.config"

    payment_method_id = fields.Many2one(
        comodel_name="pos.payment.method",
    )

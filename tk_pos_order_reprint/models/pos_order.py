# -*- coding: utf-8 -*-

from openerp.osv import fields, osv


class PosOrder(osv.osv):
    _inherit = 'pos.order'

    def wk_print_report(self, cr, uid):
        report_ids = self.pool.get('ir.actions.report.xml').search(
            cr,
            uid,
            [('model', '=', 'pos.order'),
             ('report_name', '=', 'point_of_sale.report_receipt')]
        )

        return report_ids and report_ids[0] or False

    def save_xml_receipt(self, cr, uid, order_info, order_xml):

        return

    def get_xml_receipt(self, cr, uid, order_id):
        query = """
select xml_receipt
FROM pos_order
WHERE id = %s;
        """
        cr.execute(query, (order_id,))
        res = cr.dictfetchall()

        return res[0].get('xml_receipt', False)

    def _order_fields(self, cr, uid, ui_order, context=None):

        res = super(PosOrder, self)._order_fields(cr, uid, ui_order, context)
        res.update({
            'xml_receipt': ui_order['xml_receipt'] or False
        })

        return res

    _columns = {
        'xml_receipt': fields.text('Xml receipt')
    }

import React from 'react';
import { Link2 } from 'lucide-react';

export default function BacklinksTab() {
  return (
    <div className="reports-tab__element-203--auto-203">
      <div className="glass-card reports-tab__element-204--auto-204">
        <div className="reports-tab__element-205--auto-205">
          <Link2 size={32} />
        </div>
        <div>
          <h3 className="reports-tab__title--auto-206">Tính Năng Đang Phát Triển</h3>
          <p className="reports-tab__description--auto-207">
            Hệ thống phân tích liên kết (Backlink Analysis) đang được phát triển. Tính năng này sẽ cho phép theo dõi, kiểm tra chất lượng backlink và lập chỉ mục liên kết tự động.
          </p>
        </div>
        <div className="reports-tab__element-208--auto-208">
          COMING SOON IN VERSION 1.1
        </div>
      </div>
    </div>
  );
}

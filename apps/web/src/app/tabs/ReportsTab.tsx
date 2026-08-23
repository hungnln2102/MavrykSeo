import React from 'react';

interface ReportsTabProps {
  newReportTitle: string;
  setNewReportTitle: (val: string) => void;
  newReportType: string;
  setNewReportType: (val: string) => void;
  reportsList: any[];
  setSelectedReport: (rep: any) => void;
  handleCreateReport: (e: React.FormEvent) => void;
  activeSite: any;
}

export default function ReportsTab({
  newReportTitle,
  setNewReportTitle,
  newReportType,
  setNewReportType,
  reportsList,
  setSelectedReport,
  handleCreateReport,
  activeSite,
}: ReportsTabProps) {
  return (
    <div className="reports-tab__element-194--auto-194">
      {/* Create Report Card */}
      <div className="glass-card glass-card--padded">
        <h3 className="card-header__title" style={{ marginBottom: '1rem' }}>Tạo Báo Cáo SEO</h3>
        <form onSubmit={handleCreateReport} className="font-size-md">
          <div>
            <label className="jss-form-label">Tiêu đề báo cáo</label>
            <input type="text" value={newReportTitle} onChange={e => setNewReportTitle(e.target.value)} placeholder="Ví dụ: Báo cáo SEO Q3 2026" className="dashboard-form__input" required />
          </div>
          <div>
            <label className="jss-form-label">Loại báo cáo</label>
            <select value={newReportType} onChange={e => setNewReportType(e.target.value)} className="dashboard-form__input">
              <option value="audit">Site Audit (Kiểm toán kỹ thuật)</option>
              <option value="keywords">Rank Tracker (Thứ hạng từ khóa)</option>
            </select>
          </div>
          <div className="reports-tab__element-195--auto-195">
            <p className="reports-tab__description--auto-196">Thông tin White-label:</p>
            <p>• Logo: {activeSite?.domain || 'Mavryk Logo'}</p>
            <p>• Màu chủ đạo: Indigo / Teal</p>
          </div>
          <button type="submit" className="jss-submit-btn" style={{ width: '100%', marginTop: '0.5rem' }}>
            Tạo Báo Cáo ngay
          </button>
        </form>
      </div>

      {/* Reports List Card */}
      <div className="glass-card glass-card--padded">
        <h3 className="card-header__title" style={{ marginBottom: '1rem' }}>Lịch sử Báo Cáo</h3>
        {reportsList.length === 0 ? (
          <div className="jss-empty-state">
            <p>Chưa có báo cáo nào được tạo cho dự án này.</p>
          </div>
        ) : (
          <div className="standards-tab__element-128--auto-128">
            <table className="standards-tab__table--auto-129">
              <thead>
                <tr className="reports-tab__tr--auto-197">
                  <th className="standards-tab__th--auto-134">Tiêu đề</th>
                  <th className="standards-tab__th--auto-134">Loại</th>
                  <th className="standards-tab__th--auto-134">Trạng thái</th>
                  <th className="standards-tab__th--auto-134">Ngày tạo</th>
                  <th className="standards-tab__th--auto-136">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {reportsList.map((rep) => (
                  <tr key={rep.id} className="reports-tab__tr--auto-198">
                    <td className="reports-tab__td--auto-199">{rep.title}</td>
                    <td className="reports-tab__td--auto-200">{rep.type}</td>
                    <td className="standards-tab__th--auto-134">
                      <span className="reports-tab__text-span--auto-201">
                        {rep.status}
                      </span>
                    </td>
                    <td className="standards-tab__th--auto-131">
                      {new Date(rep.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="standards-tab__th--auto-136">
                      <button
                        onClick={() => setSelectedReport(rep)}
                        className="reports-tab__element-202--auto-202"
                        type="button"
                      >
                        Xem Báo Cáo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

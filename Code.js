// =================================================================
// CẤU HÌNH DOANH NGHIỆP & CƠ SỞ DỮ LIỆU CỦA BẠN
// =================================================================
const COMPANY_NAME = "CÔNG TY TNHH AGARI";
const HR_EMAIL = "tainguyenhr.dev@gmail.com";
const SPREADSHEET_ID = "1Y1yxepri5X6CTUFbgERo8fuACwhbd7nsA68MaNOASvs"; // File Sheet của bạn
const TARGET_SHEET_NAME = "HỒ SƠ ỨNG VIÊN (ONLINE)"; // Tên Tab tự động tạo trong file
const UPLOAD_FOLDER_NAME = "AGARI_Ho_So_Ung_Vien";   // Thư mục lưu ảnh trên Google Drive

/**
 * 1. HÀM TẠO SẴN TAB TRÊN GOOGLE SHEET
 * (Chọn hàm này và bấm 'Run' để Tab hiện lên trang tính ngay lập tức)
 */
function initSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(TARGET_SHEET_NAME, 0); // Đưa tab mới lên vị trí đầu tiên
    setupSheetHeader(sheet);
    Logger.log("Đã tạo thành công tab mới: " + TARGET_SHEET_NAME);
  } else {
    if (sheet.getLastRow() === 0) {
      setupSheetHeader(sheet);
    }
    Logger.log("Tab " + TARGET_SHEET_NAME + " đã sẵn sàng!");
  }
}

/**
 * 2. HIỂN THỊ GIAO DIỆN WEB CHO NGƯỜI LAO ĐỘNG
 */
function doGet() {
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("CÔNG TY TNHH AGARI - Hồ Sơ Nhân Sự")
    .addMetaTag("viewport", "width=device-width, initial-scale=1")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * TIẾP NHẬN DỮ LIỆU POST TỪ VERCEL WEB APP
 */
function doPost(e) {
  try {
    let formData;
    if (e.postData && e.postData.contents) {
      formData = JSON.parse(e.postData.contents);
    } else {
      formData = e.parameter;
    }
    const result = submitCandidateForm(formData);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 3. TIẾP NHẬN DỮ LIỆU & LƯU VÀO SHEET + DRIVE
 */
function submitCandidateForm(formData) {
  try {
    // Kết nối Google Sheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(TARGET_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(TARGET_SHEET_NAME, 0);
      setupSheetHeader(sheet);
    } else if (sheet.getLastRow() === 0) {
      setupSheetHeader(sheet);
    } else {
      // Đảm bảo tiêu đề cột AB luôn có nếu sheet đã tồn tại từ trước
      if (sheet.getRange(1, 28).getValue() === "") {
        sheet.getRange(1, 28).setValue("Địa chỉ thường trú ghi đúng như trên căn cước")
          .setFontWeight("bold").setBackground("#0f766e").setFontColor("#ffffff");
      }
      if (sheet.getRange(1, 17).getValue() === "Địa chỉ thường trú (theo CCCD) Mới") {
        sheet.getRange(1, 17).setValue("Địa chỉ thường trú ( theo địa sát nhập mới )");
      }
    }

    // Kết nối thư mục Drive lưu ảnh
    const folder = getOrCreateFolder(UPLOAD_FOLDER_NAME);

    // Tải lên 6 ảnh minh chứng và lấy đường dẫn
    const cccdFrontLink = saveBase64File(formData.fileCccdFront, "CCCD_Truoc_" + formData.cccd, folder);
    const cccdBackLink = saveBase64File(formData.fileCccdBack, "CCCD_Sau_" + formData.cccd, folder);
    const smsLink = saveBase64File(formData.fileSms, "SMS_" + formData.cccd, folder);
    const vneidLink = saveBase64File(formData.fileVneid, "VNeID_DinhDanh2_" + formData.cccd, folder);
    const vneidChuHoLink = saveBase64File(formData.fileVneidChuHo, "VNeID_ChuHo_" + formData.cccd, folder);
    const vneidQuanHeLink = saveBase64File(formData.fileVneidQuanHe, "VNeID_QuanHe_" + formData.cccd, folder);

    // Tách Ngày - Tháng - Năm sinh
    let day = "", month = "", year = "";
    if (formData.dob) {
      const parts = formData.dob.split("-");
      if (parts.length === 3) {
        year = parts[0];
        month = parts[1];
        day = parts[2];
      }
    }

    const submitTime = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");

    // Dữ liệu dòng (đã bỏ Trình độ và Chuyên ngành)
    const rowData = [
      submitTime,
      formData.maNv || "",
      "'" + (formData.idHrm || ""),
      formData.hoTenVn || "",
      formData.hoTenEn || "",
      formData.gioiTinh || "",
      day,
      month,
      year,
      formData.dob || "",
      formData.quocTich || "Việt Nam",
      formData.danToc || "",
      "'" + (formData.dienThoai || ""),
      "'" + (formData.cccd || ""),
      formData.ngayCapCccd || "",
      formData.noiCapCccd || "",
      formData.diaChiThuongTru || "",
      formData.email || "",
      cccdFrontLink,
      cccdBackLink,
      smsLink,
      vneidLink,
      vneidChuHoLink,
      vneidQuanHeLink,
      "'" + (formData.soTaiKhoan || ""),
      formData.chuTaiKhoan || "",
      formData.tenNganHang || "",
      formData.diaChiThuongTruNganHang || ""
    ];

    sheet.appendRow(rowData);

    // Tự động gửi Email thông báo tới HR (tainguyenhr.dev@gmail.com)
    try {
      sendNotificationEmail(formData, submitTime, {
        front: cccdFrontLink,
        back: cccdBackLink,
        sms: smsLink,
        vneid: vneidLink,
        chuHo: vneidChuHoLink,
        quanHe: vneidQuanHeLink
      });
    } catch (eMail) {
      Logger.log("Lỗi gửi mail: " + eMail);
    }

    return { 
      success: true, 
      message: "Hồ sơ đã được gửi thành công đến Cty TNHH AGARI! Bộ phận nhân sự sẽ kiểm tra và phản hồi sớm." 
    };
  } catch (error) {
    return { success: false, message: "Lỗi trong quá trình gửi: " + error.toString() };
  }
}

/**
 * 4. GỬI EMAIL THÔNG BÁO CHO QUẢN LÝ
 */
function sendNotificationEmail(data, submitTime, links) {
  const subject = `[HỒ SƠ MỚI AGARI] - ${data.hoTenVn} - CCCD: ${data.cccd}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; max-width: 650px; border: 1px solid #0f766e; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f766e; color: white; padding: 15px 20px;">
        <h2 style="margin: 0; font-size: 20px;">CÔNG TY TNHH AGARI</h2>
        <p style="margin: 5px 0 0; font-size: 13px;">Thông báo: Tiếp nhận hồ sơ nhân viên mới</p>
      </div>
      <div style="padding: 20px;">
        <p><strong>Thời gian nộp:</strong> ${submitTime}</p>
        <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
          <tr style="background: #f0fdfa;"><td style="padding: 8px; border: 1px solid #ddd; width: 40%;"><strong>Họ tên (VN):</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.hoTenVn}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Họ tên (EN):</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.hoTenEn}</td></tr>
          <tr style="background: #f0fdfa;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Số CCCD:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.cccd}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Số điện thoại:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.dienThoai}</td></tr>
          <tr style="background: #f0fdfa;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.email}</td></tr>
          <tr style="background: #f0fdfa;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Địa chỉ thường trú (sáp nhập mới):</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.diaChiThuongTru || ""}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Địa chỉ thường trú (theo CCCD gốc):</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.diaChiThuongTruNganHang || ""}</td></tr>
          <tr style="background: #f0fdfa;"><td style="padding: 8px; border: 1px solid #ddd;"><strong>Tài khoản ngân hàng:</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${data.soTaiKhoan} (${data.tenNganHang}) - ${data.chuTaiKhoan}</td></tr>
        </table>

        <h4 style="color: #0f766e; margin-bottom: 8px;">Hình ảnh xác thực hồ sơ:</h4>
        <ul style="line-height: 1.8;">
          <li><a href="${links.front}" target="_blank">Ảnh CCCD Mặt trước</a></li>
          <li><a href="${links.back}" target="_blank">Ảnh CCCD Mặt sau</a></li>
          <li><a href="${links.sms}" target="_blank">Ảnh SMS xác minh thuê bao chính chủ</a></li>
          <li><a href="${links.vneid}" target="_blank">Ảnh VNeID Định danh mức 2</a></li>
          <li><a href="${links.chuHo}" target="_blank">Ảnh Chủ hộ VNeID</a></li>
          <li><a href="${links.quanHe}" target="_blank">Ảnh VNeID thể hiện mối quan hệ</a></li>
        </ul>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: HR_EMAIL,
    subject: subject,
    htmlBody: htmlBody
  });
}

function saveBase64File(fileData, prefixName, folder) {
  if (!fileData || !fileData.base64) return "";
  try {
    const contentType = fileData.type || "image/jpeg";
    const extension = fileData.name ? fileData.name.split('.').pop() : "jpg";
    const decoded = Utilities.base64Decode(fileData.base64);
    const blob = Utilities.newBlob(decoded, contentType, `${prefixName}.${extension}`);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "Lỗi tải ảnh: " + e.toString();
  }
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return DriveApp.createFolder(folderName);
  }
}

function setupSheetHeader(sheet) {
  const headers = [
    "Thời gian nộp", "Mã nhân viên", "ID HRM (CCCD)", "Họ tên VN - có dấu",
    "Họ tên EN - không dấu", "Giới tính", "Ngày sinh", "Tháng sinh", "Năm sinh",
    "Ngày tháng năm sinh", "Quốc tịch", "Dân tộc", "Điện thoại (Thuê bao chính chủ)",
    "Số CCCD", "Ngày cấp CCCD", "Nơi cấp CCCD", "Địa chỉ thường trú ( theo địa sát nhập mới )",
    "Email", "Link Ảnh CCCD Mặt trước", "Link Ảnh CCCD Mặt sau",
    "Link Ảnh SMS xác minh thuê bao chính chủ", "Ảnh VneID Định danh mức 2",
    "Ảnh Chủ hộ VneID", "Ảnh VneID thể hiện mối quan hệ",
    "Số tài khoản", "Chủ tài khoản EN - không dấu", "Tên ngân hàng",
    "Địa chỉ thường trú ghi đúng như trên căn cước"
  ];
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f766e").setFontColor("#ffffff");
  sheet.setFrozenRows(1);
}

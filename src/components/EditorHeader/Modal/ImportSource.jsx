import { Upload, Banner } from "@douyinfe/semi-ui";
import { STATUS } from "../../../data/constants";
import { useTranslation } from "react-i18next";

export default function ImportSource({
  importData,
  setImportData,
  error,
  setError,
}) {
  const { t } = useTranslation();

  return (
    <div>
      <Upload
        action="#"
        beforeUpload={({ file, fileList }) => {
          const f = fileList[0].fileInstance;
          if (!f) {
            return;
          }
          // 從檔案名稱中提取圖表名稱（移除副檔名）
          const fileName = f.name;
          const diagramName = fileName.replace(/\.(sql|json|dbml)$/i, '').trim() || 'Untitled diagram';
          
          const reader = new FileReader();
          reader.onload = async (e) => {
            setImportData((prev) => ({ 
              ...prev, 
              src: e.target.result,
              fileName: diagramName // 傳遞檔案名稱
            }));
          };
          reader.readAsText(f);

          return {
            autoRemove: false,
            fileInstance: file.fileInstance,
            status: "success",
            shouldUpload: false,
          };
        }}
        draggable={true}
        dragMainText={t("drag_and_drop_files")}
        dragSubText={t("upload_sql_to_generate_diagrams")}
        accept=".sql"
        onRemove={() => {
          setError({
            type: STATUS.NONE,
            message: "",
          });
          setImportData((prev) => ({ ...prev, src: "" }));
        }}
        onFileChange={() =>
          setError({
            type: STATUS.NONE,
            message: "",
          })
        }
        limit={1}
      />
      <div className="mt-2">
        {error.type === STATUS.ERROR ? (
          <Banner
            type="danger"
            fullMode={false}
            description={<div>{error.message}</div>}
          />
        ) : error.type === STATUS.OK ? (
          <Banner
            type="info"
            fullMode={false}
            description={<div>{error.message}</div>}
          />
        ) : (
          error.type === STATUS.WARNING && (
            <Banner
              type="warning"
              fullMode={false}
              description={<div>{error.message}</div>}
            />
          )
        )}
      </div>
    </div>
  );
}

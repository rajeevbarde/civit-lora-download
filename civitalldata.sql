CREATE TABLE ALLCivitData AS
SELECT DISTINCT temp_table.*, t.tags
FROM (
SELECT
	-- t.tag,
 	 mv.model_id AS modelId,
 	 m.name AS modelName,
    m.description AS modelDescription,
    m.type AS modelType,
    m.nsfw AS modelNsfw,
    m.nsfwLevel AS modelNsfwLevel,
    m.downloadCount AS modelDownloadCount,
 	 
    mv.id AS modelVersionId,
    mv.name AS modelVersionName,
    mv.description AS modelVersionDescription,
    mv.basemodel,
    mv.basemodeltype,
    mv.nsfwLevel AS modelVersionNsfwLevel,
    mv.downloadCount AS modelVersionDownloadCount,
        
    f.name AS fileName,
    f.type AS fileType,
    f.downloadUrl AS fileDownloadUrl,
    ROUND(f.sizeKB / 1024 / 1024.0,2) AS size_in_gb,
    mv.publishedAt

FROM files f
JOIN modelVersions mv ON f.modelVersion_id = mv.id
JOIN models m ON mv.model_id = m.id
LEFT JOIN tags t ON mv.model_id = t.model_id 
WHERE 
    f.type NOT IN ('Training Data', 'Archive', 'Config', 'Text Encoder')
    AND f.format NOT IN ('pt', 'ONNX', 'Diffusers', 'Core ML')
    AND mv.baseModel IN ('baseModel','Flux.1 D','Flux.1 S','HiDream','Hunyuan 1','Hunyuan Video','Illustrious','LTXV','Lumina','NoobAI','Other','Pony','SD 1.5','SD 1.5 Hyper','SD 1.5 LCM','SD 3','SD 3.5','SD 3.5 Large','SD 3.5 Large Turbo','SD 3.5 Medium','SDXL 1.0','SDXL 1.0 LCM','SDXL Distilled','SDXL Hyper','SDXL Lightning','SDXL Turbo','Stable Cascade','SVD','SVD XT','Wan Video')
    AND m.type = 'LORA'
     --AND t.tag LIKE '%family guy%'
    -- AND mv.basemodeltype != 'Standard'
    -- AND m.nsfw = 0
    ORDER BY mv.downloadCount DESC, mv.model_id DESC   
) AS temp_table
JOIN new_tags_table t ON temp_table.modelId = t.model_id
ORDER BY temp_table.modelVersionDownloadCount DESC;

-- Add new columns after table creation
ALTER TABLE ALLCivitData ADD COLUMN isDownloaded INTEGER;
ALTER TABLE ALLCivitData ADD COLUMN file_path TEXT;

/*
SELECT 
    f.id,
    f.sizeKB,
    f.name AS fileName,
    f.type AS fileType,
    f.format,
    f.modelVersion_id,
    f.downloadUrl AS fileDownloadUrl,
    f.primaryFile,

    mv.id AS modelVersionId,
    mv.model_id AS modelVersionModelId,
    mv.name AS modelVersionName,
    mv.basemodel,
    mv.basemodeltype,
    mv.publishedAt,
    mv.nsfwLevel AS modelVersionNsfwLevel,
    mv.description AS modelVersionDescription,
    mv.downloadUrl AS modelVersionDownloadUrl,
    mv.downloadCount AS modelVersionDownloadCount,

    m.id AS modelId,
    m.name AS modelName,
    m.description AS modelDescription,
    m.type AS modelType,
    m.nsfw AS modelNsfw,
    m.nsfwLevel AS modelNsfwLevel,
    m.downloadCount AS modelDownloadCount,

    t.tag

FROM files f
JOIN modelVersions mv ON f.modelVersion_id = mv.id
JOIN models m ON mv.model_id = m.id
LEFT JOIN tags t ON mv.model_id = t.model_id 
WHERE 
    f.type NOT IN ('Training Data', 'Archive', 'Config', 'Text Encoder')
    AND f.format NOT IN ('pt', 'ONNX', 'Diffusers', 'Core ML')
   -- AND f.modelVersion_id = 1213
    AND t.tag LIKE '%test%';
    
    */

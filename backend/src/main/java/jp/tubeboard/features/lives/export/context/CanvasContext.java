package jp.tubeboard.features.lives.export.context;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.FieldAnswerResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.GroupItemResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.VariantResponse;
import jp.tubeboard.features.lives.stageplot.StagePlotValues;

/**
 * Builds the JEXL evaluation namespace exposed to expressions inside text
 * elements. The shape is deliberately minimal so that any user-defined form can
 * be referenced uniformly via {@code fields[id]} and {@code groups[id].items}.
 */
public final class CanvasContext {

    public static final class FieldRef {
        private final String value;
        private final List<String> values;
        private final boolean empty;
        private final Integer approxMinutes;

        public FieldRef(String value, List<String> values, boolean empty) {
            this(value, values, empty, null);
        }

        public FieldRef(String value, List<String> values, boolean empty, Integer approxMinutes) {
            this.value = value;
            this.values = values;
            this.empty = empty;
            this.approxMinutes = approxMinutes;
        }

        public String getValue() { return value; }
        public List<String> getValues() { return values; }
        public boolean isEmpty() { return empty; }
        /** 曲の欄だけ: iTunes の曲の長さから出した演奏時間の概算（分、切り上げ）。分からなければ null。 */
        public Integer getApproxMinutes() { return approxMinutes; }

        static FieldRef from(FieldAnswerResponse answer, String blockType, SongDurations songDurations) {
            FieldRef ref = from(answer, blockType);
            if (!"SONG".equals(blockType)) return ref;
            return new FieldRef(ref.value, ref.values, ref.empty, songDurations.approxMinutes(answer));
        }

        public static FieldRef from(FieldAnswerResponse answer, String blockType) {
            if (answer == null || answer.values() == null || answer.values().isEmpty()) {
                return new FieldRef("", List.of(), true);
            }
            if ("STAGE_PLOT".equals(blockType)) {
                // 配置図の値は JSON なので、式では置いたアイコンのラベルの一覧として扱う
                List<String> labels = StagePlotValues.labels(answer.values().get(0));
                return new FieldRef(String.join(" / ", labels), labels, labels.isEmpty());
            }
            String joined = formatValues(answer.values(), blockType);
            return new FieldRef(joined, List.copyOf(answer.values()), false);
        }

        private static String formatValues(List<String> values, String blockType) {
            if ("BOOLEAN".equals(blockType) && values.size() == 1) {
                String v = values.get(0);
                if ("true".equalsIgnoreCase(v)) return "true";
                if ("false".equalsIgnoreCase(v)) return "false";
            }
            return String.join(" / ", values);
        }
    }

    public static final class GroupRef {
        private final List<ItemRef> items;
        private final int count;

        public GroupRef(List<ItemRef> items, int count) {
            this.items = items;
            this.count = count;
        }

        public List<ItemRef> getItems() { return items; }
        public int getCount() { return count; }
    }

    public static final class ItemRef {
        private final int index;
        private final String variant;
        private final Map<String, FieldRef> fields;
        private final Map<String, GroupRef> groups;

        public ItemRef(int index, String variant, Map<String, FieldRef> fields,
                Map<String, GroupRef> groups) {
            this.index = index;
            this.variant = variant;
            this.fields = fields;
            this.groups = groups;
        }

        public int getIndex() { return index; }
        public String getVariant() { return variant; }
        public Map<String, FieldRef> getFields() { return fields; }
        public Map<String, GroupRef> getGroups() { return groups; }

        public FieldRef field(String id) {
            return fields.getOrDefault(id, new FieldRef("", List.of(), true));
        }

        public GroupRef group(String id) {
            return groups.getOrDefault(id, new GroupRef(List.of(), 0));
        }
    }

    public static final class LiveRef {
        private final String name;
        private final LocalDate date;
        private final String location;
        private final String tenantName;
        private final LocalDateTime deadlineAt;
        private final String status;

        public LiveRef(String name, LocalDate date, String location, String tenantName,
                LocalDateTime deadlineAt, String status) {
            this.name = name;
            this.date = date;
            this.location = location;
            this.tenantName = tenantName;
            this.deadlineAt = deadlineAt;
            this.status = status;
        }

        public String getName() { return name; }
        public LocalDate getDate() { return date; }
        public String getLocation() { return location; }
        public String getTenantName() { return tenantName; }
        public LocalDateTime getDeadlineAt() { return deadlineAt; }
        public String getStatus() { return status; }
    }

    public static final class SubmissionRef {
        private final LocalDateTime submittedAt;

        public SubmissionRef(LocalDateTime submittedAt) {
            this.submittedAt = submittedAt;
        }

        public LocalDateTime getSubmittedAt() { return submittedAt; }
    }

    private CanvasContext() {
    }

    /** Build a fresh evaluation namespace. Mutable map so callers can inject loop vars. */
    public static Map<String, Object> build(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission) {
        Map<String, FieldRef> fieldRefs = new HashMap<>();
        Map<String, GroupRef> groupRefs = new HashMap<>();

        Map<String, FieldAnswerResponse> answers = indexAnswers(submission.answers());
        Map<String, FormBlockResponse> blocksById = new HashMap<>();
        indexBlocks(config.blocks(), blocksById);
        SongDurations songDurations = new SongDurations(submission.itunesLinks());

        for (FormBlockResponse block : blocksById.values()) {
            if ("REPEATABLE_GROUP".equals(block.type())) {
                FieldAnswerResponse answer = answers.get(block.id());
                List<GroupItemResponse> items = answer != null && answer.items() != null
                        ? answer.items()
                        : List.of();
                List<ItemRef> itemRefs = new ArrayList<>(items.size());
                for (int i = 0; i < items.size(); i++) {
                    itemRefs.add(buildItemRef(block, items.get(i), i, songDurations));
                }
                groupRefs.put(block.id(), new GroupRef(itemRefs, itemRefs.size()));
            } else if (!"SECTION".equals(block.type())) {
                fieldRefs.put(block.id(), FieldRef.from(answers.get(block.id()), block.type(), songDurations));
            }
        }

        Map<String, Object> root = new HashMap<>();
        root.put("live", new LiveRef(
                live.name(), live.date(), live.location(), live.tenantName(),
                live.deadlineAt(), live.status() != null ? live.status().name() : null));
        root.put("submission", new SubmissionRef(submission.submittedAt()));
        root.put("fields", fieldRefs);
        root.put("groups", groupRefs);
        return root;
    }

    private static ItemRef buildItemRef(FormBlockResponse groupBlock, GroupItemResponse item, int index,
            SongDurations songDurations) {
        Map<String, FieldRef> itemFields = new HashMap<>();
        Map<String, GroupRef> itemGroups = new HashMap<>();
        Map<String, FieldAnswerResponse> answers = indexAnswers(item.answers());
        List<FormBlockResponse> blocks = flattenItemBlocks(groupBlock, item.variantId());
        for (FormBlockResponse field : blocks) {
            if ("SECTION".equals(field.type())) continue;
            if ("REPEATABLE_GROUP".equals(field.type())) {
                FieldAnswerResponse answer = answers.get(field.id());
                List<GroupItemResponse> nested = answer != null && answer.items() != null
                        ? answer.items() : List.of();
                List<ItemRef> nestedRefs = new ArrayList<>(nested.size());
                for (int i = 0; i < nested.size(); i++) {
                    nestedRefs.add(buildItemRef(field, nested.get(i), i, songDurations));
                }
                itemGroups.put(field.id(), new GroupRef(nestedRefs, nestedRefs.size()));
                continue;
            }
            itemFields.put(field.id(), FieldRef.from(answers.get(field.id()), field.type(), songDurations));
        }
        return new ItemRef(index, item.variantId(), itemFields, itemGroups);
    }

    /** Returns all blocks reachable from the chosen variant (or root fields),
     *  recursively descending through SECTION nodes so nested groups are
     *  visible at the same level. */
    private static List<FormBlockResponse> flattenItemBlocks(FormBlockResponse block, String variantId) {
        List<FormBlockResponse> raw = block.itemFields(variantId);
        List<FormBlockResponse> out = new ArrayList<>();
        flattenSections(raw, out);
        return out;
    }

    private static void flattenSections(List<FormBlockResponse> blocks, List<FormBlockResponse> out) {
        if (blocks == null) return;
        for (FormBlockResponse b : blocks) {
            if ("SECTION".equals(b.type())) {
                flattenSections(b.fields(), out);
            } else {
                out.add(b);
            }
        }
    }

    private static Map<String, FieldAnswerResponse> indexAnswers(List<FieldAnswerResponse> answers) {
        Map<String, FieldAnswerResponse> out = new HashMap<>();
        if (answers == null) return out;
        for (FieldAnswerResponse a : answers) out.put(a.fieldId(), a);
        return out;
    }

    private static void indexBlocks(List<FormBlockResponse> blocks, Map<String, FormBlockResponse> out) {
        if (blocks == null) return;
        for (FormBlockResponse b : blocks) {
            out.put(b.id(), b);
            indexBlocks(b.fields(), out);
            if (b.variants() != null) {
                for (VariantResponse v : b.variants()) {
                    indexBlocks(v.fields(), out);
                }
            }
        }
    }
}

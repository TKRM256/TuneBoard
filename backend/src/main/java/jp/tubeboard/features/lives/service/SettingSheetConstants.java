package jp.tubeboard.features.lives.service;

import java.util.Set;

public final class SettingSheetConstants {
        public static final String SUBMISSION_STATUS = "SUBMITTED";

        public static final String LAYOUT_FULL = "full";
        public static final String LAYOUT_TWO_THIRDS = "two-thirds";
        public static final String LAYOUT_HALF = "half";
        public static final String LAYOUT_THIRD = "third";

        public static final String APPEARANCE_PLAIN = "plain";
        public static final String APPEARANCE_OUTLINE = "outline";
        public static final String APPEARANCE_SUBTLE = "subtle";

        public static final String BLOCK_SECTION = "SECTION";
        public static final String BLOCK_SHORT_TEXT = "SHORT_TEXT";
        public static final String BLOCK_LONG_TEXT = "LONG_TEXT";
        public static final String BLOCK_SINGLE_SELECT = "SINGLE_SELECT";
        public static final String BLOCK_MULTI_SELECT = "MULTI_SELECT";
        public static final String BLOCK_CHECKBOX = "CHECKBOX";
        public static final String BLOCK_BOOLEAN = "BOOLEAN";
        public static final String BLOCK_REPEATABLE_GROUP = "REPEATABLE_GROUP";

        public static final Set<String> SUPPORTED_BLOCK_TYPES = Set.of(
                        BLOCK_SECTION,
                        BLOCK_SHORT_TEXT,
                        BLOCK_LONG_TEXT,
                        BLOCK_SINGLE_SELECT,
                        BLOCK_MULTI_SELECT,
                        BLOCK_CHECKBOX,
                        BLOCK_BOOLEAN,
                        BLOCK_REPEATABLE_GROUP);
        public static final Set<String> OPTION_BLOCK_TYPES = Set.of(
                        BLOCK_SINGLE_SELECT,
                        BLOCK_MULTI_SELECT,
                        BLOCK_CHECKBOX);
        public static final Set<String> VALUE_BLOCK_TYPES = Set.of(
                        BLOCK_SHORT_TEXT,
                        BLOCK_LONG_TEXT,
                        BLOCK_SINGLE_SELECT,
                        BLOCK_MULTI_SELECT,
                        BLOCK_CHECKBOX,
                        BLOCK_BOOLEAN);
        public static final Set<String> LAYOUT_WIDTHS = Set.of(
                        LAYOUT_FULL,
                        LAYOUT_TWO_THIRDS,
                        LAYOUT_HALF,
                        LAYOUT_THIRD);
        public static final Set<String> APPEARANCES = Set.of(
                        APPEARANCE_PLAIN,
                        APPEARANCE_OUTLINE,
                        APPEARANCE_SUBTLE);

        public static final String DUPLICATE_ROLE_NONE = "";
        public static final String DUPLICATE_ROLE_SONG_TITLE = "SONG_TITLE";
        public static final String DUPLICATE_ROLE_SONG_ARTIST = "SONG_ARTIST";
        public static final Set<String> DUPLICATE_DETECTION_ROLES = Set.of(
                        DUPLICATE_ROLE_SONG_TITLE,
                        DUPLICATE_ROLE_SONG_ARTIST);

        private SettingSheetConstants() {
        }
}
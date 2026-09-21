import React from "react";

export default function PollEditor({
  question,
  options,
  onQuestionChange,
  onOptionChange,
  onAddOption,
}) {
  return (
    <div className="s-create-composer__poll">
      <input
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        placeholder="Ask a question"
        aria-label="Poll question"
      />
      {options.map((option, index) => (
        <input
          key={index}
          value={option}
          onChange={(event) => onOptionChange(index, event.target.value)}
          placeholder={`Option ${index + 1}`}
          aria-label={`Poll option ${index + 1}`}
        />
      ))}
      {options.length < 4 && (
        <button type="button" onClick={onAddOption}>
          Add option
        </button>
      )}
    </div>
  );
}
